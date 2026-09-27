-- Nethor • Messagerie Équipe v2 — RPC, triggers et durcissement.

create or replace function public.create_chat_conversation(p_type text,p_name text default null,p_member_ids uuid[] default array[]::uuid[])
returns uuid language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); other_id uuid; cid uuid;
begin
 if uid is null or not private.can_module(uid,'chat','view') then raise exception 'not allowed'; end if;
 if p_type not in ('direct','group') then raise exception 'invalid conversation type'; end if;
 if p_type='direct' then
  select x into other_id from unnest(coalesce(p_member_ids,array[]::uuid[])) x where x<>uid limit 1;
  if other_id is null or not exists(select 1 from public.profiles p where p.id=other_id and private.can_module(p.id,'chat','view')) then raise exception 'unknown participant'; end if;
  select c.id into cid from public.chat_conversations c
   where c.type='direct'
    and (select count(*) from public.chat_participants cp where cp.conversation_id=c.id)=2
    and exists(select 1 from public.chat_participants cp where cp.conversation_id=c.id and cp.user_id=uid)
    and exists(select 1 from public.chat_participants cp where cp.conversation_id=c.id and cp.user_id=other_id)
   limit 1;
  if cid is not null then return cid; end if;
  insert into public.chat_conversations(type,created_by) values('direct',uid) returning id into cid;
  insert into public.chat_participants(conversation_id,user_id,role) values(cid,uid,'owner'),(cid,other_id,'member');
  return cid;
 end if;
 if nullif(trim(coalesce(p_name,'')),'') is null then raise exception 'group name required'; end if;
 insert into public.chat_conversations(type,name,created_by) values('group',left(trim(p_name),80),uid) returning id into cid;
 insert into public.chat_participants(conversation_id,user_id,role) values(cid,uid,'owner');
 insert into public.chat_participants(conversation_id,user_id,role)
  select cid,x,'member' from (select distinct unnest(coalesce(p_member_ids,array[]::uuid[])) x) s
  where x<>uid and exists(select 1 from public.profiles p where p.id=x and private.can_module(p.id,'chat','view'))
  on conflict do nothing;
 return cid;
end $$;

create or replace function public.chat_mark_read(p_conversation uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); ctype text;
begin
 if uid is null then return; end if;
 select type into ctype from public.chat_conversations where id=p_conversation;
 if ctype is null then return; end if;
 if ctype='general' then
  insert into public.chat_participants(conversation_id,user_id,role,last_read_at)
  values(p_conversation,uid,'member',now())
  on conflict(conversation_id,user_id) do update set last_read_at=excluded.last_read_at;
 elsif private.chat_is_participant(p_conversation,uid) then
  update public.chat_participants set last_read_at=now() where conversation_id=p_conversation and user_id=uid;
 end if;
end $$;

create or replace function public.chat_set_muted(p_conversation uuid,p_muted boolean)
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not private.chat_can_read(p_conversation,uid) then raise exception 'not allowed'; end if;
 insert into public.chat_participants(conversation_id,user_id,role,muted)
 select p_conversation,uid,'member',coalesce(p_muted,false)
 where exists(select 1 from public.chat_conversations where id=p_conversation and type='general')
 on conflict(conversation_id,user_id) do update set muted=excluded.muted;
 update public.chat_participants set muted=coalesce(p_muted,false) where conversation_id=p_conversation and user_id=uid;
end $$;

create or replace function public.chat_update_group(p_conversation uuid,p_name text,p_member_ids uuid[])
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); owner_id uuid;
begin
 if uid is null or not private.chat_can_manage(p_conversation,uid) then raise exception 'not allowed'; end if;
 if not exists(select 1 from public.chat_conversations where id=p_conversation and type='group') then raise exception 'not a group'; end if;
 update public.chat_conversations set name=left(trim(coalesce(p_name,'Groupe')),80),updated_at=now() where id=p_conversation;
 select created_by into owner_id from public.chat_conversations where id=p_conversation;
 delete from public.chat_participants where conversation_id=p_conversation and user_id<>coalesce(owner_id,uid) and user_id<>uid;
 insert into public.chat_participants(conversation_id,user_id,role)
  select p_conversation,x,case when x=coalesce(owner_id,uid) then 'owner' else 'member' end
  from (select distinct unnest(coalesce(p_member_ids,array[]::uuid[])) x) s
  where exists(select 1 from public.profiles p where p.id=x and private.can_module(p.id,'chat','view'))
 on conflict(conversation_id,user_id) do update set role=excluded.role;
 insert into public.chat_participants(conversation_id,user_id,role)
 values(p_conversation,uid,case when uid=coalesce(owner_id,uid) then 'owner' else 'member' end)
 on conflict do nothing;
end $$;

create or replace function public.chat_leave_conversation(p_conversation uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); ctype text; prole text;
begin
 if uid is null then raise exception 'not allowed'; end if;
 select c.type,cp.role into ctype,prole from public.chat_conversations c join public.chat_participants cp on cp.conversation_id=c.id and cp.user_id=uid where c.id=p_conversation;
 if ctype is null or ctype in ('general','direct') then raise exception 'cannot leave'; end if;
 if prole='owner' then raise exception 'owner cannot leave; delete the group instead'; end if;
 delete from public.chat_participants where conversation_id=p_conversation and user_id=uid;
end $$;

create or replace function public.chat_delete_conversation(p_conversation uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not private.chat_can_manage(p_conversation,uid) then raise exception 'not allowed'; end if;
 if exists(select 1 from public.chat_conversations where id=p_conversation and type='general') then raise exception 'general cannot be deleted'; end if;
 delete from storage.objects where bucket_id='chat-files' and name in(select attachment_path from public.chat_messages where conversation_id=p_conversation and attachment_path is not null);
 delete from public.chat_conversations where id=p_conversation;
end $$;

create or replace function public.list_chat_conversations()
returns table(conversation_id uuid,conversation_type text,conversation_name text,created_by uuid,updated_at timestamptz,my_role text,last_read_at timestamptz,member_ids uuid[],member_names text[],last_message text,last_message_at timestamptz,last_sender uuid,unread_count bigint)
language sql stable security definer set search_path=''
as $$
with mine as(
 select c.id,c.type,c.name,c.created_by,c.updated_at,cp.role,cp.last_read_at
 from public.chat_conversations c left join public.chat_participants cp on cp.conversation_id=c.id and cp.user_id=auth.uid()
 where private.can_module(auth.uid(),'chat','view') and(c.type='general' or cp.user_id is not null)
)
select m.id,m.type,m.name,m.created_by,m.updated_at,m.role,m.last_read_at,
 coalesce((select array_agg(cp.user_id order by coalesce(p.display_name,'')) from public.chat_participants cp left join public.profiles p on p.id=cp.user_id where cp.conversation_id=m.id),array[]::uuid[]),
 coalesce((select array_agg(coalesce(p.display_name,'Utilisateur') order by coalesce(p.display_name,'')) from public.chat_participants cp left join public.profiles p on p.id=cp.user_id where cp.conversation_id=m.id),array[]::text[]),
 (select case when cm.deleted_at is not null then 'Message supprimé' when nullif(trim(cm.body),'') is not null then left(cm.body,120) when cm.attachment_path is not null then '📎 Pièce jointe' else '' end from public.chat_messages cm where cm.conversation_id=m.id order by cm.created_at desc limit 1),
 (select cm.created_at from public.chat_messages cm where cm.conversation_id=m.id order by cm.created_at desc limit 1),
 (select cm.user_id from public.chat_messages cm where cm.conversation_id=m.id order by cm.created_at desc limit 1),
 (select count(*) from public.chat_messages cm where cm.conversation_id=m.id and cm.user_id<>auth.uid() and cm.deleted_at is null and cm.created_at>coalesce(m.last_read_at,'epoch'::timestamptz))
from mine m order by coalesce((select max(cm.created_at) from public.chat_messages cm where cm.conversation_id=m.id),m.updated_at) desc
$$;

create or replace function public.notify_chat_message()
returns trigger language plpgsql security definer set search_path=''
as $$
declare ctype text; cname text; title_text text; preview text;
begin
 select type,name into ctype,cname from public.chat_conversations where id=new.conversation_id;
 preview:=case when nullif(trim(coalesce(new.body,'')),'') is not null then left(new.body,120) else 'Pièce jointe' end;
 title_text:=case when ctype='direct' then 'Nouveau message de '||coalesce(new.display_name,'un membre') when ctype='group' then 'Nouveau message • '||coalesce(cname,'Groupe') else 'Nouveau message • Général' end;
 insert into public.planning_notifications(user_id,created_by,kind,title,message,target_url)
 select cp.user_id,new.user_id,'chat_message',title_text,preview,'chat.html?c='||new.conversation_id::text
 from public.chat_participants cp
 where cp.conversation_id=new.conversation_id and cp.user_id<>new.user_id and cp.muted=false and private.can_module(cp.user_id,'chat','view');
 return new;
end $$;
drop trigger if exists chat_message_notify_trigger on public.chat_messages;
create trigger chat_message_notify_trigger after insert on public.chat_messages for each row execute function public.notify_chat_message();

create or replace function public.chat_touch_conversation()
returns trigger language plpgsql security definer set search_path=''
as $$begin update public.chat_conversations set updated_at=now() where id=new.conversation_id;return new;end$$;
drop trigger if exists chat_touch_conversation_trigger on public.chat_messages;
create trigger chat_touch_conversation_trigger after insert or update on public.chat_messages for each row execute function public.chat_touch_conversation();

create or replace function public.chat_add_general_participant()
returns trigger language plpgsql security definer set search_path=''
as $$
declare g uuid;
begin
 select id into g from public.chat_conversations where type='general' limit 1;
 if g is not null then insert into public.chat_participants(conversation_id,user_id,role) values(g,new.id,'member') on conflict do nothing; end if;
 return new;
end $$;
drop trigger if exists chat_profile_general_participant on public.profiles;
create trigger chat_profile_general_participant after insert on public.profiles for each row execute function public.chat_add_general_participant();

revoke execute on function public.create_chat_conversation(text,text,uuid[]) from public,anon;
revoke execute on function public.list_chat_conversations() from public,anon;
revoke execute on function public.chat_mark_read(uuid) from public,anon;
revoke execute on function public.chat_update_group(uuid,text,uuid[]) from public,anon;
revoke execute on function public.chat_delete_conversation(uuid) from public,anon;
revoke execute on function public.chat_set_muted(uuid,boolean) from public,anon;
revoke execute on function public.chat_leave_conversation(uuid) from public,anon;
grant execute on function public.create_chat_conversation(text,text,uuid[]) to authenticated;
grant execute on function public.list_chat_conversations() to authenticated;
grant execute on function public.chat_mark_read(uuid) to authenticated;
grant execute on function public.chat_update_group(uuid,text,uuid[]) to authenticated;
grant execute on function public.chat_delete_conversation(uuid) to authenticated;
grant execute on function public.chat_set_muted(uuid,boolean) to authenticated;
grant execute on function public.chat_leave_conversation(uuid) to authenticated;
revoke execute on function public.notify_chat_message() from public,anon,authenticated;
revoke execute on function public.chat_touch_conversation() from public,anon,authenticated;
revoke execute on function public.chat_add_general_participant() from public,anon,authenticated;

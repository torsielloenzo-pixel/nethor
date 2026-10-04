-- Nethor • Chat contacts persistants, nettoyage des discussions et canal Général personnalisable.

alter table public.chat_conversations
  add column if not exists direct_key text,
  add column if not exists avatar_url text,
  add column if not exists avatar_path text;

create or replace function private.chat_direct_key(p_a uuid,p_b uuid)
returns text
language sql immutable
set search_path=''
as $$
  select case
    when p_a is null or p_b is null or p_a=p_b then null
    else least(p_a::text,p_b::text)||':'||greatest(p_a::text,p_b::text)
  end
$$;

-- Rattache les conversations directes existantes à une clé de paire stable.
with pair_keys as (
  select c.id,
         string_agg(cp.user_id::text,':' order by cp.user_id::text) as pair_key
  from public.chat_conversations c
  join public.chat_participants cp on cp.conversation_id=c.id
  where c.type='direct'
  group by c.id
  having count(*)=2
)
update public.chat_conversations c
set direct_key=p.pair_key,
    archived_at=null,
    archived_by=null
from pair_keys p
where c.id=p.id;

create unique index if not exists chat_direct_pair_unique_idx
on public.chat_conversations(direct_key)
where type='direct' and direct_key is not null;

create or replace function private.chat_make_direct_contact(p_a uuid,p_b uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_key text:=private.chat_direct_key(p_a,p_b);
  v_id uuid;
begin
  if v_key is null then return null; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_key,0));

  select c.id into v_id
  from public.chat_conversations c
  where c.type='direct' and c.direct_key=v_key
  limit 1;

  if v_id is null then
    select c.id into v_id
    from public.chat_conversations c
    where c.type='direct'
      and (select count(*) from public.chat_participants cp where cp.conversation_id=c.id)=2
      and exists(select 1 from public.chat_participants cp where cp.conversation_id=c.id and cp.user_id=p_a)
      and exists(select 1 from public.chat_participants cp where cp.conversation_id=c.id and cp.user_id=p_b)
    limit 1;

    if v_id is not null then
      update public.chat_conversations
      set direct_key=v_key,archived_at=null,archived_by=null
      where id=v_id;
    else
      insert into public.chat_conversations(type,created_by,direct_key)
      values('direct',null,v_key)
      returning id into v_id;
    end if;
  end if;

  insert into public.chat_participants(conversation_id,user_id,role)
  values(v_id,p_a,'member'),(v_id,p_b,'member')
  on conflict(conversation_id,user_id) do nothing;

  update public.chat_user_conversation_state
  set archived_at=null,hidden_at=null,updated_at=now()
  where conversation_id=v_id and user_id in (p_a,p_b);

  return v_id;
end
$$;

-- Crée immédiatement le carnet de contacts complet pour les comptes existants.
do $$
declare r record;
begin
  for r in
    select p1.id as a,p2.id as b
    from public.profiles p1
    join public.profiles p2 on p1.id::text<p2.id::text
  loop
    perform private.chat_make_direct_contact(r.a,r.b);
  end loop;
end
$$;

create or replace function public.chat_ensure_my_contacts()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  r record;
  total integer:=0;
begin
  if uid is null or not private.can_module(uid,'chat','view') then
    raise exception 'not allowed';
  end if;

  for r in select p.id from public.profiles p where p.id<>uid loop
    perform private.chat_make_direct_contact(uid,r.id);
    total:=total+1;
  end loop;

  return total;
end
$$;

create or replace function public.chat_get_direct_contact(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
  if uid is null or not private.can_module(uid,'chat','view') then raise exception 'not allowed'; end if;
  if p_user is null or p_user=uid or not exists(select 1 from public.profiles p where p.id=p_user) then
    raise exception 'unknown participant';
  end if;
  return private.chat_make_direct_contact(uid,p_user);
end
$$;

-- Conserve l'ancien RPC pour compatibilité, mais les directs sont désormais des contacts persistants.
create or replace function public.create_chat_conversation(p_type text,p_name text default null,p_member_ids uuid[] default array[]::uuid[])
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid(); other_id uuid; cid uuid;
begin
  if uid is null or not private.can_module(uid,'chat','view') then raise exception 'not allowed'; end if;
  if p_type not in ('direct','group') then raise exception 'invalid conversation type'; end if;

  if p_type='direct' then
    select x into other_id from unnest(coalesce(p_member_ids,array[]::uuid[])) x where x<>uid limit 1;
    if other_id is null or not exists(select 1 from public.profiles p where p.id=other_id) then
      raise exception 'unknown participant';
    end if;
    return private.chat_make_direct_contact(uid,other_id);
  end if;

  if nullif(trim(coalesce(p_name,'')),'') is null then raise exception 'group name required'; end if;
  insert into public.chat_conversations(type,name,created_by)
  values('group',left(trim(p_name),80),uid)
  returning id into cid;

  insert into public.chat_participants(conversation_id,user_id,role)
  values(cid,uid,'owner');

  insert into public.chat_participants(conversation_id,user_id,role)
  select cid,x,'member'
  from (select distinct unnest(coalesce(p_member_ids,array[]::uuid[])) x) s
  where x<>uid and exists(select 1 from public.profiles p where p.id=x)
  on conflict do nothing;

  return cid;
end
$$;

create or replace function private.chat_profile_direct_contacts()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare r record;
begin
  for r in select p.id from public.profiles p where p.id<>new.id loop
    perform private.chat_make_direct_contact(new.id,r.id);
  end loop;
  return new;
end
$$;

drop trigger if exists chat_profile_direct_contacts on public.profiles;
create trigger chat_profile_direct_contacts
after insert on public.profiles
for each row execute function private.chat_profile_direct_contacts();

create or replace function private.chat_cleanup_direct_contacts()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  delete from public.chat_conversations c
  where c.type='direct'
    and (select count(*) from public.chat_participants cp where cp.conversation_id=c.id)<>2;
  return old;
end
$$;

drop trigger if exists chat_profile_direct_cleanup on public.profiles;
create trigger chat_profile_direct_cleanup
after delete on public.profiles
for each row execute function private.chat_cleanup_direct_contacts();

-- Les contacts directs et le canal Général sont permanents : ils ne peuvent plus être archivés/masqués.
update public.chat_user_conversation_state s
set archived_at=null,hidden_at=null,updated_at=now()
where exists(
  select 1 from public.chat_conversations c
  where c.id=s.conversation_id and c.type in ('direct','general')
);

update public.chat_conversations
set archived_at=null,archived_by=null
where type in ('direct','general');

create or replace function public.chat_set_user_conversation_state(p_conversation uuid,p_action text)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  conv_type text;
begin
  if uid is null then raise exception 'not allowed'; end if;
  if not private.chat_can_read(p_conversation,uid) then raise exception 'not allowed'; end if;
  if p_action not in ('archive','hide','restore') then raise exception 'invalid action'; end if;

  select c.type into conv_type
  from public.chat_conversations c
  where c.id=p_conversation;

  if conv_type in ('general','direct') and p_action in ('archive','hide') then
    raise exception 'conversation is permanent';
  end if;

  insert into public.chat_user_conversation_state(user_id,conversation_id,archived_at,hidden_at,updated_at)
  values(
    uid,p_conversation,
    case when p_action='archive' then now() else null end,
    case when p_action='hide' then now() else null end,
    now()
  )
  on conflict(user_id,conversation_id) do update
  set archived_at=case
        when p_action='archive' then now()
        when p_action in ('hide','restore') then null
        else public.chat_user_conversation_state.archived_at
      end,
      hidden_at=case
        when p_action='hide' then now()
        when p_action in ('archive','restore') then null
        else public.chat_user_conversation_state.hidden_at
      end,
      updated_at=now();
end
$$;

create or replace function public.chat_archive_conversation(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  rowdata public.chat_conversations%rowtype;
  is_admin boolean:=false;
begin
  if uid is null then raise exception 'not allowed'; end if;
  select private.has_role(array['admin']) into is_admin;
  select * into rowdata from public.chat_conversations where id=p_conversation;

  if rowdata.id is null then raise exception 'conversation not found'; end if;
  if rowdata.type in ('general','direct') then raise exception 'conversation cannot be archived'; end if;

  if not is_admin and not private.chat_can_manage(p_conversation,uid) then
    raise exception 'not allowed';
  end if;

  if rowdata.archived_at is not null then return; end if;

  update public.chat_conversations
  set archived_at=now(),archived_by=uid,updated_at=now()
  where id=p_conversation;

  insert into public.chat_archive_logs(
    conversation_id,conversation_type,conversation_name,created_by,archived_by,details
  ) values (
    rowdata.id,rowdata.type,rowdata.name,rowdata.created_by,uid,
    jsonb_build_object(
      'member_count',(select count(*) from public.chat_participants where conversation_id=rowdata.id),
      'message_count',(select count(*) from public.chat_messages where conversation_id=rowdata.id)
    )
  );
end
$$;

create or replace function public.list_my_archived_chat_conversations()
returns table(
  conversation_id uuid,conversation_type text,conversation_name text,created_by uuid,
  archived_at timestamptz,member_ids uuid[],member_names text[],last_message text,last_message_at timestamptz
)
language sql stable security definer set search_path=''
as $$
  select c.id,c.type,c.name,c.created_by,ucs.archived_at,
    coalesce((select array_agg(cp.user_id order by coalesce(p.display_name,'')) from public.chat_participants cp left join public.profiles p on p.id=cp.user_id where cp.conversation_id=c.id),array[]::uuid[]),
    coalesce((select array_agg(coalesce(p.display_name,'Utilisateur') order by coalesce(p.display_name,'')) from public.chat_participants cp left join public.profiles p on p.id=cp.user_id where cp.conversation_id=c.id),array[]::text[]),
    (select case when cm.deleted_at is not null then 'Message supprimé' when nullif(trim(cm.body),'') is not null then left(cm.body,120) when cm.attachment_path is not null then 'Pièce jointe' else '' end from public.chat_messages cm where cm.conversation_id=c.id order by cm.created_at desc limit 1),
    (select cm.created_at from public.chat_messages cm where cm.conversation_id=c.id order by cm.created_at desc limit 1)
  from public.chat_user_conversation_state ucs
  join public.chat_conversations c on c.id=ucs.conversation_id
  left join public.chat_participants mine on mine.conversation_id=c.id and mine.user_id=auth.uid()
  where ucs.user_id=auth.uid()
    and ucs.archived_at is not null
    and c.archived_at is null
    and c.type='group'
    and mine.user_id is not null
    and private.can_module(auth.uid(),'chat','view')
  order by ucs.archived_at desc
$$;

create or replace function public.chat_set_general_avatar(p_url text,p_path text default null)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  clean_url text:=nullif(trim(coalesce(p_url,'')),'');
  clean_path text:=nullif(trim(coalesce(p_path,'')),'');
begin
  if uid is null or not private.has_role(array['admin']) then raise exception 'not allowed'; end if;

  if clean_url is not null and clean_url !~ '^https://gioxrpaiwogqqtakjpnv\.supabase\.co/storage/v1/object/public/portal-assets/' then
    raise exception 'invalid avatar url';
  end if;

  update public.chat_conversations
  set avatar_url=clean_url,avatar_path=clean_path,updated_at=now()
  where type='general';
end
$$;

revoke execute on function public.chat_ensure_my_contacts() from public,anon;
revoke execute on function public.chat_get_direct_contact(uuid) from public,anon;
revoke execute on function public.chat_set_general_avatar(text,text) from public,anon;
grant execute on function public.chat_ensure_my_contacts() to authenticated;
grant execute on function public.chat_get_direct_contact(uuid) to authenticated;
grant execute on function public.chat_set_general_avatar(text,text) to authenticated;


-- Durcissement : les contacts directs et Général sont des entrées permanentes.
create or replace function public.chat_delete_conversation(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  ctype text;
begin
  if uid is null then raise exception 'not allowed'; end if;

  select c.type into ctype
  from public.chat_conversations c
  where c.id=p_conversation;

  if ctype is null then raise exception 'conversation not found'; end if;
  if ctype in ('general','direct') then raise exception 'conversation is permanent'; end if;
  if not private.chat_can_manage(p_conversation,uid) then raise exception 'not allowed'; end if;

  delete from public.chat_conversations where id=p_conversation;
end
$$;

revoke execute on function private.chat_direct_key(uuid,uuid) from public,anon,authenticated;
revoke execute on function private.chat_make_direct_contact(uuid,uuid) from public,anon,authenticated;
revoke execute on function private.chat_profile_direct_contacts() from public,anon,authenticated;
revoke execute on function private.chat_cleanup_direct_contacts() from public,anon,authenticated;

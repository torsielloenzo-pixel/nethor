-- Préférences personnelles du chat : archivage et suppression visuelle par utilisateur.

create table if not exists public.chat_user_conversation_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  archived_at timestamptz,
  hidden_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,conversation_id)
);

alter table public.chat_user_conversation_state enable row level security;

drop policy if exists "chat user state own read" on public.chat_user_conversation_state;
create policy "chat user state own read" on public.chat_user_conversation_state
for select to authenticated using(user_id=(select auth.uid()));

drop policy if exists "chat user state own insert" on public.chat_user_conversation_state;
create policy "chat user state own insert" on public.chat_user_conversation_state
for insert to authenticated with check(user_id=(select auth.uid()));

drop policy if exists "chat user state own update" on public.chat_user_conversation_state;
create policy "chat user state own update" on public.chat_user_conversation_state
for update to authenticated using(user_id=(select auth.uid()))
with check(user_id=(select auth.uid()));

drop policy if exists "chat user state own delete" on public.chat_user_conversation_state;
create policy "chat user state own delete" on public.chat_user_conversation_state
for delete to authenticated using(user_id=(select auth.uid()));

revoke all on public.chat_user_conversation_state from anon;
grant select,insert,update,delete on public.chat_user_conversation_state to authenticated;

create index if not exists chat_user_state_conversation_idx
on public.chat_user_conversation_state(conversation_id,user_id);

create or replace function public.chat_set_user_conversation_state(p_conversation uuid,p_action text)
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'not allowed'; end if;
 if not private.chat_can_read(p_conversation,uid) then raise exception 'not allowed'; end if;
 if p_action not in ('archive','hide','restore') then raise exception 'invalid action'; end if;
 insert into public.chat_user_conversation_state(user_id,conversation_id,archived_at,hidden_at,updated_at)
 values(uid,p_conversation,case when p_action='archive' then now() else null end,case when p_action='hide' then now() else null end,now())
 on conflict(user_id,conversation_id) do update
 set archived_at=case when p_action='archive' then now() when p_action in ('hide','restore') then null else public.chat_user_conversation_state.archived_at end,
     hidden_at=case when p_action='hide' then now() when p_action in ('archive','restore') then null else public.chat_user_conversation_state.hidden_at end,
     updated_at=now();
end $$;

revoke execute on function public.chat_set_user_conversation_state(uuid,text) from public,anon;
grant execute on function public.chat_set_user_conversation_state(uuid,text) to authenticated;

-- list_chat_conversations() ignore les archives personnelles et les conversations
-- masquées tant qu'aucun nouveau message d'un autre membre n'est arrivé.

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
   and (c.type='general' or mine.user_id is not null)
   and private.can_module(auth.uid(),'chat','view')
 order by ucs.archived_at desc
$$;

revoke execute on function public.list_my_archived_chat_conversations() from public,anon;
grant execute on function public.list_my_archived_chat_conversations() to authenticated;

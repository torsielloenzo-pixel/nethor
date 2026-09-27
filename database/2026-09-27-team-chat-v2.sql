-- Nethor • Messagerie Équipe v2
-- Structure finale correspondant aux migrations appliquées sur Supabase le 27/09/2026.

create extension if not exists pgcrypto;

create table if not exists public.chat_conversations(
 id uuid primary key default gen_random_uuid(),
 type text not null check(type in ('general','direct','group')),
 name text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists chat_one_general_idx on public.chat_conversations((type)) where type='general';
create index if not exists chat_conversations_created_by_idx on public.chat_conversations(created_by);

create table if not exists public.chat_participants(
 conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','member')),
 joined_at timestamptz not null default now(),
 last_read_at timestamptz,
 muted boolean not null default false,
 primary key(conversation_id,user_id)
);
create index if not exists chat_participants_user_idx on public.chat_participants(user_id,conversation_id);

alter table public.chat_messages
 add column if not exists conversation_id uuid references public.chat_conversations(id) on delete cascade,
 add column if not exists reply_to bigint references public.chat_messages(id) on delete set null,
 add column if not exists edited_at timestamptz,
 add column if not exists deleted_at timestamptz;

do $$
declare g uuid;
begin
 select id into g from public.chat_conversations where type='general' limit 1;
 if g is null then insert into public.chat_conversations(type,name) values('general','Général') returning id into g; end if;
 update public.chat_messages set conversation_id=g where conversation_id is null;
 insert into public.chat_participants(conversation_id,user_id,role)
 select g,p.id,'member' from public.profiles p on conflict do nothing;
end $$;

alter table public.chat_messages alter column conversation_id set not null;
create index if not exists chat_messages_conversation_created_idx on public.chat_messages(conversation_id,created_at desc);
create index if not exists chat_messages_reply_to_idx on public.chat_messages(reply_to);

create table if not exists public.chat_reactions(
 message_id bigint not null references public.chat_messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 emoji text not null check(char_length(emoji) between 1 and 12),
 created_at timestamptz not null default now(),
 primary key(message_id,user_id,emoji)
);
create index if not exists chat_reactions_user_id_idx on public.chat_reactions(user_id);

create schema if not exists private;

create or replace function private.chat_is_participant(p_conversation uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.chat_participants where conversation_id=p_conversation and user_id=p_user)$$;

create or replace function private.chat_can_read(p_conversation uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.chat_conversations c where c.id=p_conversation and (c.type='general' or exists(select 1 from public.chat_participants cp where cp.conversation_id=c.id and cp.user_id=p_user)))$$;

create or replace function private.chat_can_manage(p_conversation uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.profiles p where p.id=p_user and p.role='admin') or exists(select 1 from public.chat_participants cp where cp.conversation_id=p_conversation and cp.user_id=p_user and cp.role='owner')$$;

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_reactions enable row level security;

drop policy if exists "chat conversations read" on public.chat_conversations;
create policy "chat conversations read" on public.chat_conversations for select to authenticated
using(private.chat_can_read(id,(select auth.uid())) and private.can_module((select auth.uid()),'chat','view'));

drop policy if exists "chat participants read" on public.chat_participants;
create policy "chat participants read" on public.chat_participants for select to authenticated
using(private.chat_can_read(conversation_id,(select auth.uid())) and private.can_module((select auth.uid()),'chat','view'));

drop policy if exists "chat module read" on public.chat_messages;
create policy "chat module read" on public.chat_messages for select to authenticated
using(private.chat_can_read(conversation_id,(select auth.uid())) and private.can_module((select auth.uid()),'chat','view'));

drop policy if exists "chat module insert" on public.chat_messages;
create policy "chat module insert" on public.chat_messages for insert to authenticated
with check(user_id=(select auth.uid()) and private.chat_can_read(conversation_id,(select auth.uid())) and private.can_module((select auth.uid()),'chat','view'));

drop policy if exists "chat module update" on public.chat_messages;
create policy "chat module update" on public.chat_messages for update to authenticated
using((user_id=(select auth.uid()) or private.can_module((select auth.uid()),'chat','manage')) and private.chat_can_read(conversation_id,(select auth.uid())))
with check((user_id=(select auth.uid()) or private.can_module((select auth.uid()),'chat','manage')) and private.chat_can_read(conversation_id,(select auth.uid())));

drop policy if exists "chat module delete" on public.chat_messages;
create policy "chat module delete" on public.chat_messages for delete to authenticated
using((user_id=(select auth.uid()) or private.can_module((select auth.uid()),'chat','manage')) and private.chat_can_read(conversation_id,(select auth.uid())));

drop policy if exists "chat reactions read" on public.chat_reactions;
create policy "chat reactions read" on public.chat_reactions for select to authenticated
using(exists(select 1 from public.chat_messages m where m.id=message_id and private.chat_can_read(m.conversation_id,(select auth.uid()))));
drop policy if exists "chat reactions insert" on public.chat_reactions;
create policy "chat reactions insert" on public.chat_reactions for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.chat_messages m where m.id=message_id and private.chat_can_read(m.conversation_id,(select auth.uid()))));
drop policy if exists "chat reactions delete" on public.chat_reactions;
create policy "chat reactions delete" on public.chat_reactions for delete to authenticated using(user_id=(select auth.uid()));

grant select on public.chat_conversations,public.chat_participants to authenticated;
grant select,insert,update,delete on public.chat_messages to authenticated;
grant select,insert,delete on public.chat_reactions to authenticated;

-- Le détail des RPC (création de conversations, groupes, lecture, mute, départ,
-- suppression) est géré par les migrations Supabase team_chat_*_v2.
-- Ces fonctions utilisent auth.uid(), private.can_module() et les vérifications
-- de participation avant toute écriture.

drop policy if exists "chat_files_admin_delete" on storage.objects;
create policy "chat_files_admin_delete" on storage.objects for delete to authenticated
using(bucket_id='chat-files' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')));

alter table public.planning_notifications drop constraint if exists planning_notifications_kind_check;
alter table public.planning_notifications add constraint planning_notifications_kind_check
check(kind=any(array['manual_edit','import_new','import_replace','reset_day','reset_week','password_reset_request','admin_message','absence_request','absence_decision','chat_message']));

do $$ begin alter publication supabase_realtime add table public.chat_conversations; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.chat_participants; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.chat_reactions; exception when duplicate_object then null; end $$;

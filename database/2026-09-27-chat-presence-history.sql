-- Historique de présence utilisé uniquement par la messagerie Équipe.

create table if not exists public.chat_presence_history (
  user_id uuid primary key references auth.users(id) on delete cascade,
  online_since timestamptz,
  last_seen_at timestamptz not null default now(),
  last_session_seconds bigint not null default 0 check(last_session_seconds >= 0),
  total_online_seconds bigint not null default 0 check(total_online_seconds >= 0),
  updated_at timestamptz not null default now()
);

alter table public.chat_presence_history enable row level security;

drop policy if exists "chat presence read for chat users" on public.chat_presence_history;
create policy "chat presence read for chat users"
on public.chat_presence_history for select to authenticated
using (private.can_module((select auth.uid()),'chat','view'));

revoke all on public.chat_presence_history from anon;
grant select on public.chat_presence_history to authenticated;

create or replace function public.chat_presence_ping(p_event text default 'heartbeat')
returns void
language plpgsql security definer set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  now_at timestamptz:=now();
  row_data public.chat_presence_history%rowtype;
  elapsed bigint:=0;
begin
  if uid is null then raise exception 'not allowed'; end if;

  select * into row_data
  from public.chat_presence_history
  where user_id=uid
  for update;

  if not found then
    insert into public.chat_presence_history(user_id,online_since,last_seen_at,updated_at)
    values(uid,case when p_event='end' then null else now_at end,now_at,now_at);
    return;
  end if;

  if p_event<>'end'
     and row_data.online_since is not null
     and row_data.last_seen_at < now_at - interval '2 minutes' then
    elapsed:=greatest(0,extract(epoch from (row_data.last_seen_at-row_data.online_since))::bigint);
    update public.chat_presence_history
       set last_session_seconds=elapsed,
           total_online_seconds=total_online_seconds+elapsed,
           online_since=now_at,
           last_seen_at=now_at,
           updated_at=now_at
     where user_id=uid;
    return;
  end if;

  if p_event='end' then
    elapsed:=case when row_data.online_since is null then 0
                  else greatest(0,extract(epoch from (now_at-row_data.online_since))::bigint) end;
    update public.chat_presence_history
       set last_session_seconds=elapsed,
           total_online_seconds=total_online_seconds+elapsed,
           online_since=null,
           last_seen_at=now_at,
           updated_at=now_at
     where user_id=uid;
    return;
  end if;

  update public.chat_presence_history
     set online_since=coalesce(online_since,now_at),
         last_seen_at=now_at,
         updated_at=now_at
   where user_id=uid;
end $$;

revoke execute on function public.chat_presence_ping(text) from public,anon;
grant execute on function public.chat_presence_ping(text) to authenticated;

create index if not exists chat_presence_last_seen_idx
on public.chat_presence_history(last_seen_at desc);

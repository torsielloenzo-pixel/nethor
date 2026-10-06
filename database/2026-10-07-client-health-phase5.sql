-- Phase 5 : incidents techniques anonymises dans la vue administrateur.
-- Les evenements ne contiennent ni messages d'erreur bruts, ni URL, ni donnees metier.
create table if not exists public.nethor_client_health_events(
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  domain text not null check(domain in ('planning','chat','notifications','tasks','sync','app')),
  code text not null check(code in (
    'FETCH_FAILED','SYNC_TIMEOUT','REALTIME_DISCONNECTED','STALE_DATA',
    'SAVE_CONFLICT','SAVE_UNCONFIRMED','APP_ERROR','PROMISE_ERROR'
  )),
  platform text not null check(platform in ('mobile','desktop')),
  build integer not null check(build between 1 and 999999),
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists nethor_health_created_idx on public.nethor_client_health_events(created_at desc);
create index if not exists nethor_health_user_recent_idx on public.nethor_client_health_events(user_id,created_at desc);
alter table public.nethor_client_health_events enable row level security;
revoke all on public.nethor_client_health_events from public,anon,authenticated;
grant insert,select on public.nethor_client_health_events to authenticated;

-- Un compte valide peut declarer ses propres codes predefinis, pas ceux d'un tiers.
drop policy if exists nethor_health_insert_own on public.nethor_client_health_events;
create policy nethor_health_insert_own on public.nethor_client_health_events
  for insert to authenticated
  with check (user_id=(select auth.uid()) and (select private.session_is_active()));

-- Les incidents des autres utilisateurs ne sont accessibles qu'aux admins.
drop policy if exists nethor_health_admin_select on public.nethor_client_health_events;
create policy nethor_health_admin_select on public.nethor_client_health_events
  for select to authenticated
  using ((select private.can_module((select auth.uid()),'portal_admin','manage')));

-- Limite serveur : un utilisateur ne peut pas generer plus de 30 lignes sur 15 min.
create or replace function private.nethor_limit_client_health()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.user_id is distinct from (select auth.uid())
     or not (select private.session_is_active()) then
    raise exception 'invalid session' using errcode='42501';
  end if;
  if (select pg_catalog.count(*)
        from public.nethor_client_health_events
        where user_id=new.user_id and created_at>pg_catalog.now()-interval '15 minutes')>=30 then
    return null;
  end if;
  return new;
end
$$;
revoke all on function private.nethor_limit_client_health() from public,anon,authenticated;
drop trigger if exists nethor_health_limit_before_insert on public.nethor_client_health_events;
create trigger nethor_health_limit_before_insert
 before insert on public.nethor_client_health_events
 for each row execute function private.nethor_limit_client_health();

-- L'auditeur confirme que les roles clients ne peuvent pas modifier/supprimer les incidents.
revoke update,delete,truncate,trigger,references on public.nethor_client_health_events from public,anon,authenticated;

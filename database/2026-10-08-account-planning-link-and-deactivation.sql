-- Nethor — Liaison compte/planning et désactivation sécurisée des comptes.
-- La désactivation est contrôlée côté serveur et invalide les sessions existantes.

alter table public.profiles
  add column if not exists planning_name text,
  add column if not exists account_enabled boolean not null default true;

create unique index if not exists profiles_planning_name_unique
  on public.profiles (lower(btrim(planning_name)))
  where planning_name is not null and btrim(planning_name) <> '';

create or replace function private.session_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with raw_claims as (
    select
      (select auth.uid()) as user_id,
      nullif((select auth.jwt()->>'session_id'),'') as session_id_text
  ),
  parsed as (
    select
      user_id,
      case
        when session_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then session_id_text::uuid
        else null::uuid
      end as session_id
    from raw_claims
  )
  select exists (
    select 1
    from parsed c
    join auth.sessions s
      on s.id = c.session_id
     and s.user_id = c.user_id
    join public.profiles p
      on p.id = c.user_id
    where c.user_id is not null
      and c.session_id is not null
      and p.account_enabled = true
      and (s.not_after is null or s.not_after > now())
      and s.created_at >= p.sessions_valid_after
  )
$$;

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_enabled = true
  ) then
    return new;
  end if;

  if new.display_name is distinct from old.display_name
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.sessions_valid_after is distinct from old.sessions_valid_after
     or new.planning_name is distinct from old.planning_name
     or new.account_enabled is distinct from old.account_enabled then
    raise exception 'Only an administrator can change account identity, role, planning link or account state';
  end if;

  return new;
end;
$$;

drop function if exists public.list_team_members();
drop function if exists private.list_team_members_impl();

create function private.list_team_members_impl()
returns table(
  id uuid,
  display_name text,
  role text,
  avatar_path text,
  status_text text,
  profile_color text,
  avatar_frame text,
  contract_hours numeric,
  planning_name text,
  account_enabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,p.display_name,p.role,p.avatar_path,p.status_text,p.profile_color,
    p.avatar_frame,p.contract_hours,p.planning_name,p.account_enabled
  from public.profiles p
  where (select auth.uid()) is not null
    and (p.role <> 'admin' or nullif(btrim(p.planning_name),'') is not null)
  order by coalesce(p.planning_name,p.display_name,'');
$$;

revoke all on function private.list_team_members_impl() from public, anon;
grant execute on function private.list_team_members_impl() to authenticated;

create function public.list_team_members()
returns table(
  id uuid,
  display_name text,
  role text,
  avatar_path text,
  status_text text,
  profile_color text,
  avatar_frame text,
  contract_hours numeric,
  planning_name text,
  account_enabled boolean
)
language sql
stable
set search_path = ''
as $$
  select * from private.list_team_members_impl();
$$;

revoke all on function public.list_team_members() from public, anon;
grant execute on function public.list_team_members() to authenticated;

create or replace function public.admin_set_account_enabled(
  p_user_id uuid,
  p_enabled boolean
)
returns table(
  account_enabled boolean,
  sessions_valid_after timestamptz,
  revoked_sessions integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := clock_timestamp();
  v_revoked integer := 0;
begin
  if p_user_id is null then
    raise exception 'Invalid user';
  end if;

  update public.profiles
  set
    account_enabled = p_enabled,
    sessions_valid_after = case when p_enabled then sessions_valid_after else v_cutoff end
  where id = p_user_id;

  if not found then
    raise exception 'Account not found';
  end if;

  if not p_enabled then
    delete from auth.sessions where user_id = p_user_id;
    get diagnostics v_revoked = row_count;
  end if;

  return query
  select p.account_enabled,p.sessions_valid_after,v_revoked
  from public.profiles p
  where p.id = p_user_id;
end;
$$;

revoke all on function public.admin_set_account_enabled(uuid,boolean) from public, anon, authenticated;
grant execute on function public.admin_set_account_enabled(uuid,boolean) to service_role;

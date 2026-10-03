-- Nethor — socle comptes / sécurité
-- 2026-10-03
-- Source-controlled representation of the live Supabase hardening applied to production.
-- Goals:
--   * server-side role checks
--   * active-session validation on every authenticated Data API request
--   * immediate revocation of all pre-existing sessions for an account
--   * restrictive RLS guard on every public table
--   * deny-by-default privileges for future public objects
--   * admin analytics view evaluated with caller privileges

alter table public.profiles
  add column if not exists sessions_valid_after timestamptz not null
  default '1970-01-01 00:00:00+00'::timestamptz;

create or replace function private.role_rank(role_key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(role_key,''))
    when 'admin' then 500
    when 'role_point-de-vente' then 400
    when 'point_vente' then 400
    when 'surface_vente' then 400
    when 'responsable' then 300
    when 'employe' then 200
    when 'lecture' then 100
    else 0
  end
$$;

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
      and (s.not_after is null or s.not_after > now())
      and s.created_at >= p.sessions_valid_after
  )
$$;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and private.session_is_active()
  limit 1
$$;

create or replace function private.has_min_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.role_rank(required_role) > 0
     and private.role_rank(private.current_role()) >= private.role_rank(required_role)
$$;

create or replace function private.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.session_is_active()
     and exists (
       select 1
       from public.profiles
       where id = (select auth.uid())
         and role = any(allowed_roles)
     )
$$;

create or replace function private.can_module(
  target_user uuid,
  target_module text,
  required_permission text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user = (select auth.uid())
    and private.session_is_active()
    and case
      when required_permission='manage' then private.module_permission(target_user,target_module)='manage'
      when required_permission='operate' then private.module_permission(target_user,target_module) in ('operate','manage')
      else private.module_permission(target_user,target_module) in ('view','operate','manage')
    end
$$;

create or replace function public.nethor_security_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'authenticated', (select auth.uid()) is not null,
    'session_active', private.session_is_active(),
    'role', private.current_role(),
    'role_rank', private.role_rank(private.current_role()),
    'aal', coalesce((select auth.jwt()->>'aal'),'aal1')
  )
$$;

revoke all on function public.nethor_security_context() from public, anon;
grant execute on function public.nethor_security_context() to authenticated;

grant execute on function private.role_rank(text) to authenticated, service_role;
grant execute on function private.session_is_active() to authenticated, service_role;
grant execute on function private.current_role() to authenticated, service_role;
grant execute on function private.has_min_role(text) to authenticated, service_role;
grant execute on function private.has_role(text[]) to authenticated, service_role;
grant execute on function private.can_module(uuid,text,text) to authenticated, service_role;

update public.app_roles
set label = 'Point de vente',
    is_system = true
where key = 'role_point-de-vente';

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if auth.uid() is null then
    return new;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    return new;
  end if;

  if new.display_name is distinct from old.display_name
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.sessions_valid_after is distinct from old.sessions_valid_after then
    raise exception 'Only an administrator can change account identity, role or session validity';
  end if;

  return new;
end;
$function$;

do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname = 'public'
      and c.relrowsecurity = true
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      'nethor_active_session_guard',
      r.schema_name,
      r.table_name
    );
    execute format(
      'create policy %I on %I.%I as restrictive for all to authenticated using ((select private.session_is_active())) with check ((select private.session_is_active()))',
      'nethor_active_session_guard',
      r.schema_name,
      r.table_name
    );
  end loop;
end
$$;

create or replace function public.nethor_pre_request()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  jwt_role text := coalesce((select auth.jwt()->>'role'),'');
begin
  if jwt_role <> 'authenticated' then
    return;
  end if;

  if not private.session_is_active() then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'NETHOR_SESSION_REVOKED',
        'message', 'Session inactive ou révoquée',
        'details', 'Reconnectez-vous pour continuer',
        'hint', 'Une ancienne session ne peut plus appeler l''API Nethor'
      )::text,
      detail = json_build_object(
        'status', 401,
        'headers', json_build_object(
          'Cache-Control', 'no-store'
        )
      )::text;
  end if;
end
$$;

revoke all on function public.nethor_pre_request() from public;
grant execute on function public.nethor_pre_request() to anon, authenticated, service_role;

alter role authenticator
  set pgrst.db_pre_request = 'public.nethor_pre_request';

notify pgrst, 'reload config';

alter view public.admin_page_view_counts set (security_invoker = true);

revoke execute on function public.mark_deleted_category_unlisted() from public, anon, authenticated;
revoke execute on function public.mark_deleted_packaging_unlisted() from public, anon, authenticated;
revoke execute on function public.propagate_category_name() from public, anon, authenticated;
revoke execute on function public.propagate_packaging_name() from public, anon, authenticated;
revoke execute on function public.sync_product_taxonomy_labels() from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

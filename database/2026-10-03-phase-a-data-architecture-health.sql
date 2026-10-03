-- Nethor 2.0 — Phase A: Architecture & base de données
-- 2026-10-03
-- Live migration: nethor_phase_a_data_architecture_health
-- Purpose: expose a read-only, administrator-only architecture health snapshot
-- without altering existing business data.

create or replace function public.nethor_data_architecture_health()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null or not private.has_min_role('admin') then
    raise exception 'Administrator access required'
      using errcode = '42501';
  end if;

  with public_tables as (
    select c.oid, c.relname, c.relrowsecurity
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  ),
  missing_pk as (
    select t.relname
    from public_tables t
    where not exists (
      select 1
      from pg_catalog.pg_constraint con
      where con.conrelid = t.oid
        and con.contype = 'p'
    )
  ),
  critical(name) as (
    values
      ('profiles'),
      ('products'),
      ('planning_weeks'),
      ('planning_absences'),
      ('daily_tasks'),
      ('chat_conversations'),
      ('chat_messages'),
      ('planning_notifications'),
      ('notification_preferences'),
      ('app_settings'),
      ('audit_logs'),
      ('user_recovery_emails')
  ),
  missing_critical as (
    select c.name
    from critical c
    where pg_catalog.to_regclass('public.' || c.name) is null
  ),
  json_business_columns as (
    select cols.table_name, cols.column_name
    from information_schema.columns cols
    where cols.table_schema = 'public'
      and cols.data_type in ('json','jsonb')
      and cols.table_name in (
        'planning_weeks',
        'app_settings',
        'profiles',
        'operations_orders',
        'fl_analysis_files'
      )
  )
  select pg_catalog.jsonb_build_object(
    'checked_at', pg_catalog.now(),
    'public_tables', (select pg_catalog.count(*) from public_tables),
    'rls_enabled', (select pg_catalog.count(*) from public_tables where relrowsecurity),
    'tables_without_rls', coalesce((
      select pg_catalog.jsonb_agg(relname order by relname)
      from public_tables
      where not relrowsecurity
    ), '[]'::jsonb),
    'tables_without_primary_key', coalesce((
      select pg_catalog.jsonb_agg(relname order by relname)
      from missing_pk
    ), '[]'::jsonb),
    'critical_tables_missing', coalesce((
      select pg_catalog.jsonb_agg(name order by name)
      from missing_critical
    ), '[]'::jsonb),
    'json_business_columns', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'table', table_name,
          'column', column_name
        )
        order by table_name, column_name
      )
      from json_business_columns
    ), '[]'::jsonb)
  )
  into result;

  return result;
end
$$;

revoke all on function public.nethor_data_architecture_health() from public, anon;
grant execute on function public.nethor_data_architecture_health() to authenticated, service_role;

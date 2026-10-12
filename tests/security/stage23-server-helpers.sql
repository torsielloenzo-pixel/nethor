-- Source functions read from production 2026-10-12, for LOCAL DISPOSABLE SUPABASE AUTH ONLY.
-- DO NOT APPLY THIS FILE TO PRODUCTION.

-- private.role_rank source-md5 2392ad619e6e9a3827dc0d30fdf360a6
CREATE OR REPLACE FUNCTION private.role_rank(role_key text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
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
$function$;

-- private.current_role source-md5 2c220f75490d2bdda96b345fa9c1a3b0
CREATE OR REPLACE FUNCTION private."current_role"()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and private.session_is_active()
  limit 1
$function$;

-- private.module_permission source-md5 2905fe88c4f635357bf26e470f4c70bc
CREATE OR REPLACE FUNCTION private.module_permission(target_user uuid, target_module text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with main_role as (
  select p.role
  from public.profiles p
  where p.id=target_user
),
cfg as (
  select a.value
  from public.app_settings a
  where a.key='site_config'
  limit 1
),
main_perm as (
  select coalesce(cfg.value #>> array['role_permissions',target_module,main_role.role],'none') as permission
  from main_role left join cfg on true
),
sub_perm as (
  select case
    when bool_or(sp.permission='manage') then 'manage'
    when bool_or(sp.permission='operate') then 'operate'
    when bool_or(sp.permission='view') then 'view'
    else 'none'
  end as permission
  from public.user_subroles us
  join public.subrole_module_permissions sp on sp.subrole_key=us.subrole_key
  where us.user_id=target_user and sp.module=target_module
)
select case
  when coalesce((select permission from main_perm),'none')='manage'
    or coalesce((select permission from sub_perm),'none')='manage' then 'manage'
  when coalesce((select permission from main_perm),'none')='operate'
    or coalesce((select permission from sub_perm),'none')='operate' then 'operate'
  when coalesce((select permission from main_perm),'none')='view'
    or coalesce((select permission from sub_perm),'none')='view' then 'view'
  else 'none'
end
$function$;

-- private.can_module source-md5 d06b8874c8ee0d45677a4978d475f712
CREATE OR REPLACE FUNCTION private.can_module(target_user uuid, target_module text, required_permission text DEFAULT 'view'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    target_user = (select auth.uid())
    and private.session_is_active()
    and case
      when required_permission='manage' then private.module_permission(target_user,target_module)='manage'
      when required_permission='operate' then private.module_permission(target_user,target_module) in ('operate','manage')
      else private.module_permission(target_user,target_module) in ('view','operate','manage')
    end
$function$;

-- public.nethor_security_context source-md5 f3429020745f24e450314bc606a632df
CREATE OR REPLACE FUNCTION public.nethor_security_context()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'authenticated', (select auth.uid()) is not null,
    'session_active', private.session_is_active(),
    'role', private.current_role(),
    'role_rank', private.role_rank(private.current_role()),
    'aal', coalesce((select auth.jwt()->>'aal'),'aal1')
  )
$function$;

-- private.planning_save_week_if_revision source-md5 92920eefc5f5c63d625b1487785de493
CREATE OR REPLACE FUNCTION private.planning_save_week_if_revision(p_week_start date, p_expected_revision timestamp with time zone, p_data jsonb, p_employee_order jsonb, p_week_label text, p_source_file text, p_source_path text, p_imported_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := (select auth.uid());
  v_saved_revision timestamptz;
  v_current_revision timestamptz;
begin
  if v_actor is null
     or not (select private.session_is_active())
     or not (select private.can_module(v_actor,'planning','manage')) then
    return pg_catalog.jsonb_build_object('status','forbidden');
  end if;
  if p_week_start is null
     or extract(isodow from p_week_start)::integer <> 1
     or p_data is null
     or coalesce(p_data->>'version','') not in ('3','4')
     or p_data->>'weekStart' is distinct from p_week_start::text
     or pg_catalog.jsonb_typeof(p_data->'employees') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_data->'days') is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_employee_order) is distinct from 'array' then
    return pg_catalog.jsonb_build_object('status','invalid');
  end if;

  if p_expected_revision is null then
    insert into public.planning_weeks(
      week_start,data,employee_order,week_label,source_file,source_path,
      imported,imported_at,updated_by
    )
    values (
      p_week_start,p_data,p_employee_order,p_week_label,p_source_file,p_source_path,
      true,coalesce(p_imported_at,pg_catalog.clock_timestamp()),v_actor
    )
    on conflict (week_start) do nothing
    returning updated_at into v_saved_revision;
  else
    -- L'UPDATE prend un verrou ligne et re-vérifie WHERE après toute écriture
    -- concurrente. Une version dépassée ne peut plus remplacer la dernière.
    update public.planning_weeks
       set data=p_data,
           employee_order=p_employee_order,
           week_label=p_week_label,
           source_file=p_source_file,
           source_path=p_source_path,
           imported=true,
           imported_at=coalesce(p_imported_at,imported_at,pg_catalog.clock_timestamp()),
           updated_by=v_actor
     where week_start=p_week_start
       and updated_at=p_expected_revision
    returning updated_at into v_saved_revision;
  end if;

  if v_saved_revision is null then
    select updated_at into v_current_revision
    from public.planning_weeks
    where week_start=p_week_start;
    return pg_catalog.jsonb_build_object(
      'status','conflict',
      'current_revision',v_current_revision
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'status','ok',
    'revision',v_saved_revision
  );
end;
$function$;

-- public.planning_save_week_if_revision source-md5 a6620bb3e6fcc8f8eedd2bb87e524563
CREATE OR REPLACE FUNCTION public.planning_save_week_if_revision(p_week_start date, p_expected_revision timestamp with time zone, p_data jsonb, p_employee_order jsonb, p_week_label text, p_source_file text, p_source_path text, p_imported_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select private.planning_save_week_if_revision(
  p_week_start,p_expected_revision,p_data,p_employee_order,p_week_label,
  p_source_file,p_source_path,p_imported_at
 );
$function$;

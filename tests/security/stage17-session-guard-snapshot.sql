-- Snapshot of private.session_is_active() read from the live database, 2026-10-12.
-- Used ONLY for compilation/integration in a disposable GitHub Actions PostgreSQL service.
-- Never run this file against the live Supabase project.
-- Live pg_get_functiondef MD5: c6f123abb320f81ef5b7a99086d7be15
CREATE OR REPLACE FUNCTION private.session_is_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

-- Stage23: disposable Supabase Auth role probe only, no production deployment.
CREATE OR REPLACE FUNCTION public.stage23_role_probe()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $probe$
 SELECT jsonb_build_object(
  'role',private."current_role"(),
  'role_rank',private.role_rank(private."current_role"()),
  'session_active',private.session_is_active(),
  'planning_view',private.can_module((select auth.uid()),'planning','view'),
  'planning_manage',private.can_module((select auth.uid()),'planning','manage'),
  'chat_view',private.can_module((select auth.uid()),'chat','view'),
  'chat_manage',private.can_module((select auth.uid()),'chat','manage'),
  'team_count',(select count(*) from private.list_team_members_impl())
 );
$probe$;
REVOKE ALL ON FUNCTION public.stage23_role_probe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stage23_role_probe() TO authenticated;

-- Keep the real planning save wrapper callable to verify its internal
-- can_module(...,'manage') check. No direct table write is granted.
REVOKE ALL ON FUNCTION public.planning_save_week_if_revision(
 date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planning_save_week_if_revision(
 date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) TO authenticated;

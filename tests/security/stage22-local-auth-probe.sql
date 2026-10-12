-- For ephemeral Supabase local CI only; run after helper RPC definitions.
-- The probe is a synthetic test-only API, not part of production Nethor.
-- It evaluates the real copied session guard and staged team/subrole functions
-- under an actual PostgREST request.jwt.claims context.
CREATE OR REPLACE FUNCTION public.stage22_auth_probe()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $probe$
 SELECT jsonb_build_object(
  'session_active', (SELECT private.session_is_active()),
  'visible_team', (SELECT count(*) FROM private.list_team_members_impl()),
  'subrole_keys', (SELECT count(*) FROM public.my_subrole_keys())
 );
$probe$;
REVOKE ALL ON FUNCTION public.stage22_auth_probe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stage22_auth_probe() TO authenticated;

-- Ephemeral Supabase only. Apply after private.can_module has been installed.
ALTER TABLE public.planning_weeks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.planning_weeks FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.planning_weeks TO authenticated;
CREATE POLICY stage23_planning_read ON public.planning_weeks
 FOR SELECT TO authenticated
 USING (private.can_module((select auth.uid()),'planning','view'));
-- No direct INSERT/UPDATE/DELETE grants or policies for authenticated.

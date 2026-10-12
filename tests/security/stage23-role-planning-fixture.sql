-- Stage23: disposable Supabase Auth project only. Data and policies are SYNTHETIC.
-- The role keys and planning permissions are copied from the site's role matrix,
-- but no operational planning data from the store is imported.
CREATE TABLE public.app_settings(
 key text PRIMARY KEY,
 value jsonb NOT NULL
);
INSERT INTO public.app_settings(key,value) VALUES
 ('site_config',jsonb_build_object('role_permissions',jsonb_build_object(
  'planning',jsonb_build_object(
   'admin','manage','role_point-de-vente','manage','responsable','view','employe','view','lecture','view'),
  'chat',jsonb_build_object(
   'admin','manage','role_point-de-vente','view','responsable','view','employe','view','lecture','view'))));

CREATE TABLE public.planning_weeks(
 week_start date PRIMARY KEY,
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 employee_order jsonb NOT NULL DEFAULT '[]'::jsonb,
 week_label text,
 source_file text,
 source_path text,
 imported boolean NOT NULL DEFAULT false,
 imported_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_by uuid
);

CREATE OR REPLACE FUNCTION public.stage23_refresh_planning_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $f$
BEGIN
 NEW.updated_at=pg_catalog.clock_timestamp();
 RETURN NEW;
END;
$f$;
CREATE TRIGGER stage23_revision_updated
BEFORE UPDATE ON public.planning_weeks
FOR EACH ROW EXECUTE FUNCTION public.stage23_refresh_planning_revision();

ALTER TABLE public.planning_weeks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.planning_weeks FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.planning_weeks TO authenticated;
CREATE POLICY stage23_planning_read ON public.planning_weeks
 FOR SELECT TO authenticated
 USING (private.can_module((select auth.uid()),'planning','view'));
-- No direct INSERT/UPDATE/DELETE grants or policies for authenticated.

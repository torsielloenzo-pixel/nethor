-- NETHOR ETAPE 20 — PROPOSITION NON DEPLOYEE / REVIEW-ONLY.
-- WARNING: affects auth.users (managed by Supabase Auth). Never run against production
-- before staging integration tests, security review and rollback approval.
-- This is deliberately outside any auto-applied migration directory.
-- A failed trigger could block password changes and other Auth user updates.
-- No password hash, token or e-mail address is persisted by this trigger.

BEGIN;
ALTER TABLE public.password_reset_requests
 ADD COLUMN IF NOT EXISTS password_changed_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS confirmation_notification_at timestamptz,
 ADD COLUMN IF NOT EXISTS confirmation_notification_status text;

CREATE OR REPLACE FUNCTION private.nethor_record_verified_password_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $nethor_verified$
DECLARE
  v_changed_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
  -- Server evidence is the change of the stored Auth password hash, NOT a
  -- client-supplied event, time value, JWT claim or generic users.updated_at.
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password
     AND nullif(NEW.encrypted_password, '') IS NOT NULL THEN
    UPDATE public.password_reset_requests AS r
       SET password_changed_verified_at = v_changed_at,
           resolved_at = v_changed_at,
           resolved_by = NULL
     WHERE r.user_id = NEW.id
       AND r.reset_channel = 'email'
       AND r.email_status = 'sent'
       AND r.resolved_at IS NULL
       AND r.password_changed_verified_at IS NULL
       AND r.requested_at <= v_changed_at
       AND r.requested_at >= v_changed_at - interval '24 hours';
  END IF;
  RETURN NEW;
END;
$nethor_verified$;

-- Do NOT silently replace another installed trigger.
CREATE TRIGGER nethor_record_verified_password_change
AFTER UPDATE OF encrypted_password ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.nethor_record_verified_password_change();
COMMIT;

-- Rollback proposal, to be reviewed/tested on staging first (NOT executed):
-- BEGIN;
-- DROP TRIGGER IF EXISTS nethor_record_verified_password_change ON auth.users;
-- DROP FUNCTION IF EXISTS private.nethor_record_verified_password_change();
-- ALTER TABLE public.password_reset_requests
--   DROP COLUMN IF EXISTS confirmation_notification_status,
--   DROP COLUMN IF EXISTS confirmation_notification_at,
--   DROP COLUMN IF EXISTS password_changed_verified_at;
-- COMMIT;

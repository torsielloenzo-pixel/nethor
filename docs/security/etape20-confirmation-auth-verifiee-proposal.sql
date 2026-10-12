-- NETHOR ETAPE 20 — PROPOSITION NON DEPLOYEE / REVIEW-ONLY.
-- WARNING: affects auth.users (managed by Supabase Auth). Never run against production
-- before staging integration tests, security review and rollback approval.
-- This is deliberately outside any auto-applied migration directory.
-- A failed trigger could block password changes and other Auth user updates.
-- No password hash, raw recovery token or e-mail address is persisted by this trigger.
-- A standard password change produces evidence but MUST NOT resolve an email
-- recovery request; proof of possession of the specific sent link is separately
-- required by password-recovery-email before resolved_at is ever written.

BEGIN;
ALTER TABLE public.password_reset_requests
 ADD COLUMN IF NOT EXISTS recovery_proof_digest text,
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
       SET password_changed_verified_at = v_changed_at
     WHERE r.user_id = NEW.id
       AND r.reset_channel = 'email'
       AND r.email_status = 'sent'
       AND r.resolved_at IS NULL
       AND r.password_changed_verified_at IS NULL
       AND r.recovery_proof_digest IS NOT NULL
       AND r.requested_at <= v_changed_at
       AND r.requested_at >= v_changed_at - interval '24 hours'
       AND r.id = (
         SELECT r2.id FROM public.password_reset_requests AS r2
         WHERE r2.user_id = NEW.id
           AND r2.reset_channel = 'email'
           AND r2.email_status = 'sent'
           AND r2.recovery_proof_digest IS NOT NULL
           AND r2.resolved_at IS NULL
           AND r2.requested_at >= v_changed_at - interval '24 hours'
         ORDER BY r2.requested_at DESC, r2.id DESC LIMIT 1
       );
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
-- COMMIT;
-- Retain the tracking columns for audit/forensics; dropping them would
-- permanently destroy previously recorded verification evidence.

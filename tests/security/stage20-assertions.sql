-- Exécute uniquement dans une base PostgreSQL jetable de GitHub Actions.
-- Les tests échouent au premier comportement inattendu.
BEGIN;
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.password_reset_requests WHERE password_changed_verified_at IS NOT NULL)<>0 THEN
  RAISE EXCEPTION 'Initial state not clean';
 END IF;
END $check$;

-- Updating metadata must never prove a password change.
UPDATE auth.users SET updated_at=now() WHERE id='11111111-1111-4111-8111-111111111111';
DO $check$
BEGIN
 IF EXISTS(SELECT 1 FROM public.password_reset_requests WHERE password_changed_verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Non-password update incorrectly marked a reset verified';
 END IF;
END $check$;

-- Rewriting an identical password hash must not prove a change.
UPDATE auth.users SET encrypted_password='TEST_HASH_EMPLOYEE_V1' WHERE id='11111111-1111-4111-8111-111111111111';
DO $check$
BEGIN
 IF EXISTS(SELECT 1 FROM public.password_reset_requests WHERE password_changed_verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Identical password hash incorrectly verified';
 END IF;
END $check$;

-- Actual password hash change: a single recent sent email request is verified.
UPDATE auth.users SET encrypted_password='TEST_HASH_EMPLOYEE_V2'
 WHERE id='11111111-1111-4111-8111-111111111111';
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.password_reset_requests
   WHERE id='10000000-0000-4000-8000-000000000001'
   AND password_changed_verified_at IS NOT NULL
   AND resolved_at=password_changed_verified_at) THEN
  RAISE EXCEPTION 'Actual hash change failed to mark matching request verified';
 END IF;
 IF EXISTS(SELECT 1 FROM public.password_reset_requests
   WHERE id IN('10000000-0000-4000-8000-000000000002',
               '10000000-0000-4000-8000-000000000003',
               '10000000-0000-4000-8000-000000000004',
               '10000000-0000-4000-8000-000000000005')
   AND password_changed_verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Unrelated, stale, pending, or different-channel request marked verified';
 END IF;
END $check$;

-- Replays and non-hash edits must not alter the first verification event.
DO $check$
DECLARE previously_verified timestamptz;
BEGIN
 SELECT password_changed_verified_at INTO previously_verified FROM public.password_reset_requests
 WHERE id='10000000-0000-4000-8000-000000000001';
 UPDATE auth.users SET encrypted_password='TEST_HASH_EMPLOYEE_V2'
  WHERE id='11111111-1111-4111-8111-111111111111';
 IF previously_verified IS DISTINCT FROM (
  SELECT password_changed_verified_at FROM public.password_reset_requests
  WHERE id='10000000-0000-4000-8000-000000000001') THEN
  RAISE EXCEPTION 'Unchanged hash rewrote the verification timestamp';
 END IF;
END $check$;

-- Never mark an event solely because the client sent an acknowledgement.
DO $check$
BEGIN
 IF EXISTS(SELECT 1 FROM public.password_reset_requests
   WHERE id='10000000-0000-4000-8000-000000000005'
     AND password_changed_verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Other account accepted a forged client confirmation';
 END IF;
END $check$;
ROLLBACK;
SELECT 'stage20-password-proof-passed' AS result;

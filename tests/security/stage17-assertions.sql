-- Stage 17 disposable database assertions.
-- Uses the real Nethor private.session_is_active() SQL and the staged
-- list_team_members_impl/chat_can_manage proposals against SYNTHETIC sessions.
-- \\set ON_ERROR_STOP on is supplied by the GitHub Actions runner.

SELECT set_config('nethor.test_uid','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('nethor.test_session_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);

DO $verify$
BEGIN
 IF NOT private.session_is_active() THEN RAISE EXCEPTION 'A01 active session unexpectedly refused'; END IF;
 IF (SELECT count(*) FROM private.list_team_members_impl())<>3 THEN RAISE EXCEPTION 'A02 team list missing data'; END IF;
 IF NOT private.chat_can_manage('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111') THEN
  RAISE EXCEPTION 'A03 owner unexpectedly refused';
 END IF;
 IF private.chat_can_manage('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','22222222-2222-4222-8222-222222222222') THEN
  RAISE EXCEPTION 'A04 caller impersonated admin';
 END IF;
END
$verify$;

-- End an auth session (only in this throwaway fixture).
DELETE FROM auth.sessions WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $verify$
BEGIN
 IF private.session_is_active() THEN RAISE EXCEPTION 'R01 deleted session still active'; END IF;
 IF EXISTS(SELECT 1 FROM private.list_team_members_impl()) THEN RAISE EXCEPTION 'R02 revoked session sees team'; END IF;
 IF private.chat_can_manage('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111') THEN
  RAISE EXCEPTION 'R03 revoked session can manage chat';
 END IF;
END
$verify$;

-- A still-present session belonging to a disabled user must fail.
SELECT set_config('nethor.test_uid','33333333-3333-4333-8333-333333333333',false);
SELECT set_config('nethor.test_session_id','cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
DO $verify$
BEGIN
 IF private.session_is_active() OR EXISTS(SELECT 1 FROM private.list_team_members_impl()) THEN
  RAISE EXCEPTION 'D01 disabled user retained team access';
 END IF;
END
$verify$;

-- A JWT with a session_id of another user must never grant access.
SELECT set_config('nethor.test_uid','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('nethor.test_session_id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
DO $verify$
BEGIN
 IF private.session_is_active() THEN RAISE EXCEPTION 'I01 mismatched session accepted'; END IF;
END
$verify$;

-- Expired session and sessions_valid_after cutoff.
SELECT set_config('nethor.test_session_id','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
SELECT set_config('nethor.test_uid','44444444-4444-4444-8444-444444444444',false);
UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
DO $verify$
BEGIN
 IF private.session_is_active() THEN RAISE EXCEPTION 'E01 expired session accepted'; END IF;
END
$verify$;
UPDATE auth.sessions SET not_after=now()+interval '1 day' WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
UPDATE public.profiles SET sessions_valid_after=now() WHERE id='44444444-4444-4444-8444-444444444444';
DO $verify$
BEGIN
 IF private.session_is_active() THEN RAISE EXCEPTION 'C01 session before cutoff accepted'; END IF;
END
$verify$;

-- An active administrator still has management access to the fixture chat.
SELECT set_config('nethor.test_uid','22222222-2222-4222-8222-222222222222',false);
SELECT set_config('nethor.test_session_id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
DO $verify$
BEGIN
 IF NOT private.session_is_active() THEN RAISE EXCEPTION 'A05 active admin unexpectedly refused'; END IF;
 IF NOT private.chat_can_manage('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','22222222-2222-4222-8222-222222222222') THEN
  RAISE EXCEPTION 'A06 active admin unexpectedly denied';
 END IF;
END
$verify$;
SELECT 'stage17-security-fixture-passed' AS result;

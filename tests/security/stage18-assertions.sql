-- Stage 18: real PostgreSQL execution of the remaining ten RPC proposals,
-- on fake accounts only. ROLLBACK restores the fixture before stage17 assertions.
BEGIN;

SELECT set_config('nethor.test_uid','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('nethor.test_session_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);

DO $verify$
DECLARE res jsonb;
BEGIN
 IF (SELECT count(*) FROM public.my_subrole_keys())<>1 THEN RAISE EXCEPTION 'A01 valid subrole keys missing'; END IF;
 IF (SELECT count(*) FROM public.my_subrole_permissions() WHERE module='planning' AND permission='view')<>1 THEN
  RAISE EXCEPTION 'A02 valid subrole permissions missing';
 END IF;
 IF EXISTS(SELECT 1 FROM public.admin_notification_rules()) THEN RAISE EXCEPTION 'A03 ordinary employee sees admin rules'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_notification_users()) THEN RAISE EXCEPTION 'A04 ordinary employee sees admin users'; END IF;
 PERFORM public.chat_presence_ping('heartbeat');
 IF NOT EXISTS(SELECT 1 FROM public.chat_presence_history WHERE user_id=(SELECT auth.uid())) THEN
  RAISE EXCEPTION 'A05 heartbeat did not create presence';
 END IF;
 PERFORM public.chat_mark_all_read();
 PERFORM public.chat_mark_read('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
 PERFORM public.chat_set_muted('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',true);
 IF NOT EXISTS(SELECT 1 FROM public.chat_participants WHERE user_id=(SELECT auth.uid()) AND muted=true) THEN
  RAISE EXCEPTION 'A06 mute was not saved';
 END IF;
 PERFORM public.chat_set_user_conversation_state('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','restore');
 IF NOT EXISTS(SELECT 1 FROM public.chat_user_conversation_state WHERE user_id=(SELECT auth.uid())) THEN
  RAISE EXCEPTION 'A07 conversation state missing';
 END IF;
 res:=public.weekly_poll_results('99999999-9999-4999-8999-999999999999');
 IF res->>'available' IS DISTINCT FROM 'true' OR (res->>'total')::integer<>5 THEN
  RAISE EXCEPTION 'A08 historical poll result incorrect';
 END IF;
END
$verify$;

-- Admin permissions are available only while the administrator's own session is active.
SELECT set_config('nethor.test_uid','22222222-2222-4222-8222-222222222222',false);
SELECT set_config('nethor.test_session_id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.admin_notification_rules())<>1 THEN RAISE EXCEPTION 'A09 active admin cannot read notification rules'; END IF;
 IF (SELECT count(*) FROM public.admin_notification_users())<>4 THEN RAISE EXCEPTION 'A10 active admin cannot read notification users'; END IF;
END
$verify$;

-- Revoke the employee's session while retaining the old JWT claims.
SELECT set_config('nethor.test_uid','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('nethor.test_session_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
DELETE FROM auth.sessions WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.my_subrole_keys()) THEN RAISE EXCEPTION 'R01 revoked account sees keys'; END IF;
 IF EXISTS(SELECT 1 FROM public.my_subrole_permissions()) THEN RAISE EXCEPTION 'R02 revoked account sees permissions'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_notification_rules()) THEN RAISE EXCEPTION 'R03 revoked account sees admin rules'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_notification_users()) THEN RAISE EXCEPTION 'R04 revoked account sees admin users'; END IF;
END
$verify$;

DO $verify$ BEGIN
 BEGIN PERFORM public.chat_presence_ping('heartbeat'); RAISE EXCEPTION 'R05 revoked heartbeat accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 BEGIN PERFORM public.chat_mark_all_read(); RAISE EXCEPTION 'R06 revoked mark all accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 BEGIN PERFORM public.chat_mark_read('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'); RAISE EXCEPTION 'R07 revoked mark read accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 BEGIN PERFORM public.chat_set_muted('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',false); RAISE EXCEPTION 'R08 revoked mute accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 BEGIN PERFORM public.chat_set_user_conversation_state('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','restore'); RAISE EXCEPTION 'R09 revoked state change accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
 BEGIN PERFORM public.weekly_poll_results('99999999-9999-4999-8999-999999999999'); RAISE EXCEPTION 'R10 revoked poll results accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
END $verify$;

-- A disconnected admin must lose the same privileges even if their JWT is intact.
SELECT set_config('nethor.test_uid','22222222-2222-4222-8222-222222222222',false);
SELECT set_config('nethor.test_session_id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
DELETE FROM auth.sessions WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.admin_notification_rules()) THEN RAISE EXCEPTION 'R11 revoked admin can read rules'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_notification_users()) THEN RAISE EXCEPTION 'R12 revoked admin can read users'; END IF;
END $verify$;

ROLLBACK;
SELECT 'stage18-security-fixture-passed' AS result;

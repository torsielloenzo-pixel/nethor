-- Nethor stage 17: disposable PostgreSQL fixture, NOT a production migration.
-- All identities/session IDs are fabricated, and the database is destroyed with the CI job.
CREATE SCHEMA auth;
CREATE SCHEMA private;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  role text,
  avatar_path text,
  status_text text,
  profile_color text,
  avatar_frame text,
  contract_hours numeric,
  planning_name text,
  account_enabled boolean NOT NULL DEFAULT true,
  sessions_valid_after timestamptz NOT NULL DEFAULT '2025-01-01T00:00:00Z'
);

CREATE TABLE auth.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL,
  not_after timestamptz
);

CREATE TABLE public.chat_participants (
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  role text NOT NULL,
  PRIMARY KEY (conversation_id,user_id)
);

-- Stub ONLY the JWT claim extraction, not the Nethor session authorization rule.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path TO ''
AS $fn$
 SELECT nullif(current_setting('nethor.test_uid',true),'')::uuid;
$fn$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path TO ''
AS $fn$
 SELECT jsonb_build_object('session_id',nullif(current_setting('nethor.test_session_id',true),''));
$fn$;

INSERT INTO public.profiles(id,display_name,role,planning_name,account_enabled) VALUES
 ('11111111-1111-4111-8111-111111111111','Employé Fictif','employe','EMPLOYE FICTIF',true),
 ('22222222-2222-4222-8222-222222222222','Admin Fictif','admin',NULL,true),
 ('33333333-3333-4333-8333-333333333333','Ancien Employé','employe','ANCIEN EMPLOYE',false),
 ('44444444-4444-4444-8444-444444444444','Collègue Fictif','employe','COLLEGUE FICTIF',true);

INSERT INTO auth.sessions(id,user_id,created_at,not_after) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',now() - interval '1 hour',now() + interval '1 day'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222',now() - interval '1 hour',now() + interval '1 day'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','33333333-3333-4333-8333-333333333333',now() - interval '1 hour',now() + interval '1 day'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','44444444-4444-4444-8444-444444444444',now() - interval '1 hour',now() + interval '1 day');

INSERT INTO public.chat_participants(conversation_id,user_id,role) VALUES
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','owner'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','44444444-4444-4444-8444-444444444444','member');

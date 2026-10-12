-- Etape 20 : données de test intégralement fictives.
-- Exécution UNIQUEMENT dans le PostgreSQL jetable de GitHub Actions.
CREATE TABLE auth.users(
 id uuid PRIMARY KEY,
 encrypted_password varchar(255),
 updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.password_reset_requests(
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL,
 requested_at timestamptz NOT NULL,
 email_status text NOT NULL,
 reset_channel text NOT NULL,
 resolved_at timestamptz,
 resolved_by uuid
);
INSERT INTO auth.users(id,encrypted_password) VALUES
 ('11111111-1111-4111-8111-111111111111','TEST_HASH_EMPLOYEE_V1'),
 ('22222222-2222-4222-8222-222222222222','TEST_HASH_ADMIN_V1'),
 ('33333333-3333-4333-8333-333333333333','TEST_HASH_DISABLED_V1');

INSERT INTO public.password_reset_requests(id,user_id,requested_at,email_status,reset_channel) VALUES
 -- One eligible recovery by mail, recent, sent.
 ('10000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',now()-interval '10 minutes','sent','email'),
 -- An old request may not be resolved by a password changed now.
 ('10000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',now()-interval '30 days','sent','email'),
 -- A request for a different channel or not actually sent stays untouched.
 ('10000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111',now()-interval '3 minutes','pending','email'),
 ('10000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111',now()-interval '2 minutes','sent','admin'),
 -- Another user's request never changes due to this user's actions.
 ('10000000-0000-4000-8000-000000000005','22222222-2222-4222-8222-222222222222',now()-interval '5 minutes','sent','email');

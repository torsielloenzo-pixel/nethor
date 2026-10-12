-- DISPOSABLE Supabase CLI only: preconditions for full Deno Edge Function test.
-- All identities, inbox and password reset rows are synthetic.
ALTER TABLE public.profiles ADD COLUMN email text;
ALTER TABLE public.password_reset_requests
  ADD COLUMN identifier text,
  ADD COLUMN display_name text,
  ADD COLUMN email_error text;

CREATE TABLE public.user_recovery_emails (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  target_user_id uuid,
  action text NOT NULL,
  area text NOT NULL,
  resource_type text,
  resource_id text,
  path text,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO public.app_settings(key,value)
VALUES ('site_base_url', '{"url":"http://127.0.0.1:8767/"}'::jsonb);

-- No direct API access for fake recovery and audit tables; only the local
-- Edge Function using an ephemeral service_role can read/write them.
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recovery_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_reset_requests,public.user_recovery_emails,public.audit_logs
  FROM PUBLIC,anon,authenticated;

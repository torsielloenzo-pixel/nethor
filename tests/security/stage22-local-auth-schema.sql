-- STAGE22-LOCAL-AUTH-ONLY.
-- All data written by this file must be in ephemeral Supabase CLI Postgres.
-- NEVER APPLY ON THE NETHOR PRODUCTION PROJECT.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text,
 role text NOT NULL DEFAULT 'employe',
 avatar_path text,
 status_text text,
 profile_color text,
 avatar_frame text,
 contract_hours numeric,
 planning_name text,
 account_enabled boolean NOT NULL DEFAULT true,
 sessions_valid_after timestamptz NOT NULL DEFAULT '2025-01-01 00:00:00+00'
);

CREATE TABLE public.chat_participants (
 conversation_id uuid NOT NULL,
 user_id uuid REFERENCES public.profiles(id),
 role text NOT NULL,
 PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE public.user_subroles (
 user_id uuid REFERENCES public.profiles(id),
 subrole_key text NOT NULL,
 PRIMARY KEY(user_id,subrole_key)
);
CREATE TABLE public.subrole_module_permissions (
 subrole_key text NOT NULL,
 module text NOT NULL,
 permission text NOT NULL,
 PRIMARY KEY(subrole_key,module)
);

CREATE TABLE public.password_reset_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 requested_at timestamptz NOT NULL DEFAULT now(),
 email_status text NOT NULL DEFAULT 'sent',
 reset_channel text NOT NULL DEFAULT 'email',
 resolved_at timestamptz,
 resolved_by uuid
);


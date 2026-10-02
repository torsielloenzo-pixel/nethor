-- Recovery email flow for Nethor profiles.
-- Keeps the technical Auth email (@stock-fl.local) untouched.
create table if not exists public.user_recovery_emails (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint user_recovery_emails_email_check
    check (
      char_length(email) between 5 and 254
      and email = lower(btrim(email))
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and email !~* '@stock-fl\.local$'
    )
);

create index if not exists user_recovery_emails_updated_by_idx
  on public.user_recovery_emails(updated_by);

alter table public.user_recovery_emails enable row level security;
revoke all on table public.user_recovery_emails from anon, authenticated;

drop policy if exists user_recovery_emails_no_direct_read on public.user_recovery_emails;
create policy user_recovery_emails_no_direct_read
on public.user_recovery_emails
for select to authenticated
using (false);

create table if not exists public.email_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 160),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create index if not exists email_reset_requests_user_date_idx
  on public.email_reset_requests(user_id, requested_at desc);

create index if not exists email_reset_requests_open_idx
  on public.email_reset_requests(requested_at desc)
  where resolved_at is null;

create index if not exists email_reset_requests_resolved_by_idx
  on public.email_reset_requests(resolved_by);

alter table public.email_reset_requests enable row level security;
revoke all on table public.email_reset_requests from anon, authenticated;
grant select, update on table public.email_reset_requests to authenticated;

drop policy if exists email_reset_requests_admin_read on public.email_reset_requests;
create policy email_reset_requests_admin_read
on public.email_reset_requests
for select to authenticated
using ((select private.has_role(array['admin'])));

drop policy if exists email_reset_requests_admin_update on public.email_reset_requests;
create policy email_reset_requests_admin_update
on public.email_reset_requests
for update to authenticated
using ((select private.has_role(array['admin'])))
with check ((select private.has_role(array['admin'])));

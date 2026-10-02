-- Password reset requests — direct recovery by personal email with admin fallback
create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  identifier text not null check (char_length(identifier) between 1 and 120),
  display_name text not null check (char_length(display_name) between 1 and 160),
  requested_at timestamptz not null default now(),
  email_status text not null default 'pending'
    check (email_status in ('pending','sent','failed','not_configured')),
  email_error text,
  reset_channel text not null default 'admin'
    check (reset_channel in ('email','admin')),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create index if not exists password_reset_requests_user_date_idx
  on public.password_reset_requests(user_id, requested_at desc);
create index if not exists password_reset_requests_open_idx
  on public.password_reset_requests(requested_at desc)
  where resolved_at is null;
create index if not exists password_reset_requests_resolved_by_idx
  on public.password_reset_requests(resolved_by);

alter table public.password_reset_requests enable row level security;
revoke all on public.password_reset_requests from anon, authenticated;
grant select, update on public.password_reset_requests to authenticated;

drop policy if exists password_reset_requests_admin_read on public.password_reset_requests;
create policy password_reset_requests_admin_read
on public.password_reset_requests
for select to authenticated
using ((select private.has_role(array['admin'])));

drop policy if exists password_reset_requests_admin_update on public.password_reset_requests;
create policy password_reset_requests_admin_update
on public.password_reset_requests
for update to authenticated
using ((select private.has_role(array['admin'])))
with check ((select private.has_role(array['admin'])));

alter table public.planning_notifications
  drop constraint if exists planning_notifications_kind_check;
alter table public.planning_notifications
  add constraint planning_notifications_kind_check
  check (kind = any(array[
    'manual_edit'::text,
    'import_new'::text,
    'import_replace'::text,
    'reset_day'::text,
    'reset_week'::text,
    'password_reset_request'::text
  ]));

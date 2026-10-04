-- Nethor — suivi de lecture journalier du planning Desktop
-- Une lecture appartient à une journée atteinte. Les jours futurs restent sans statut.
-- Une modification d'une journée crée une nouvelle révision pour cette seule journée.

create table if not exists private.planning_day_revisions (
  id bigint generated always as identity primary key,
  week_start date not null references public.planning_weeks(week_start) on delete cascade,
  day_date date not null,
  revision_at timestamptz not null default now(),
  change_kind text not null default 'update',
  updated_by uuid null,
  constraint planning_day_revisions_day_in_week
    check (day_date >= week_start and day_date <= week_start + 6)
);

alter table private.planning_day_revisions enable row level security;
revoke all on table private.planning_day_revisions from public, anon, authenticated;

create index if not exists planning_day_revisions_lookup_idx
  on private.planning_day_revisions (week_start, day_date, revision_at desc);

create or replace function private.planning_name_key(p_name text)
returns text
language sql
immutable
set search_path=''
as $$
  select pg_catalog.regexp_replace(
    pg_catalog.regexp_replace(
      pg_catalog.lower(pg_catalog.btrim(coalesce(p_name,''::text))),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ' [a-z]$',
    '',
    'i'
  );
$$;

revoke all on function private.planning_name_key(text) from public, anon, authenticated;

create or replace function private.capture_planning_day_revisions()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  i integer;
  d date;
  k text;
  full_refresh boolean := false;
  changed boolean := false;
  kind text := 'day_update';
begin
  if tg_op = 'INSERT' then
    full_refresh := true;
    kind := 'import';
  else
    full_refresh :=
      old.imported_at is distinct from new.imported_at
      or old.source_path is distinct from new.source_path
      or old.source_file is distinct from new.source_file
      or old.data->'employees' is distinct from new.data->'employees';
    if full_refresh then
      kind := 'replace';
    end if;
  end if;

  for i in 0..6 loop
    d := new.week_start + i;
    k := d::text;

    if full_refresh then
      changed := true;
    elsif tg_op = 'UPDATE' then
      changed := (old.data->'days'->k is distinct from new.data->'days'->k);
    else
      changed := false;
    end if;

    if changed then
      insert into private.planning_day_revisions(
        week_start, day_date, revision_at, change_kind, updated_by
      )
      values(
        new.week_start,
        d,
        coalesce(new.updated_at, pg_catalog.now()),
        kind,
        new.updated_by
      );
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.capture_planning_day_revisions() from public, anon, authenticated;

drop trigger if exists planning_day_revisions_capture on public.planning_weeks;
create trigger planning_day_revisions_capture
after insert or update of data, imported_at, source_file, source_path on public.planning_weeks
for each row execute function private.capture_planning_day_revisions();

insert into private.planning_day_revisions(
  week_start, day_date, revision_at, change_kind, updated_by
)
select
  w.week_start,
  w.week_start + g.i,
  coalesce(w.updated_at, w.imported_at, pg_catalog.now()),
  'backfill',
  w.updated_by
from public.planning_weeks w
cross join pg_catalog.generate_series(0,6) as g(i)
where not exists (
  select 1
  from private.planning_day_revisions r
  where r.week_start=w.week_start
    and r.day_date=w.week_start+g.i
);

drop function if exists public.planning_day_read_status(date,date);
drop function if exists private.planning_day_read_status_impl(date,date);

create function private.planning_day_read_status_impl(
  p_week_start date,
  p_day date
)
returns table(
  user_id uuid,
  day_date date,
  status_visible boolean,
  is_read boolean,
  read_at timestamptz,
  revision_at timestamptz
)
language sql
stable
security definer
set search_path=''
as $$
  with params as (
    select
      p_week_start as week_start,
      p_day as day_date,
      (pg_catalog.now() at time zone 'Europe/Paris')::date as today_paris,
      (p_day::timestamp at time zone 'Europe/Paris') as day_start,
      ((p_day + 1)::timestamp at time zone 'Europe/Paris') as day_end
  ),
  authorized as (
    select 1
    from params x
    where (select auth.uid()) is not null
      and (select private.session_is_active())
      and (select private.can_module((select auth.uid()), 'planning', 'manage'))
      and x.day_date between x.week_start and x.week_start + 6
  ),
  week_row as (
    select w.week_start,w.data
    from public.planning_weeks w
    join params x on x.week_start=w.week_start
    where exists(select 1 from authorized)
  ),
  linked as (
    select distinct p.id as user_id
    from public.profiles p
    join week_row w on true
    where p.role <> 'admin'
      and exists (
        select 1
        from pg_catalog.jsonb_array_elements(coalesce(w.data->'employees','[]'::jsonb)) e
        where private.planning_name_key(e->>'name')=private.planning_name_key(p.display_name)
      )
  ),
  revision as (
    select max(r.revision_at) as revision_at
    from private.planning_day_revisions r
    join params x on x.week_start=r.week_start and x.day_date=r.day_date
    where r.revision_at < x.day_end
  )
  select
    l.user_id,
    x.day_date,
    (x.day_date <= x.today_paris and rv.revision_at is not null) as status_visible,
    case
      when x.day_date > x.today_paris or rv.revision_at is null then null
      else (lh.read_at is not null and lh.read_at >= rv.revision_at)
    end as is_read,
    case
      when x.day_date > x.today_paris or rv.revision_at is null then null
      else lh.read_at
    end as read_at,
    rv.revision_at
  from linked l
  cross join params x
  cross join revision rv
  left join lateral (
    select max(coalesce(h.signed_in_at,h.created_at)) as read_at
    from public.login_history h
    where h.user_id=l.user_id
      and coalesce(h.signed_in_at,h.created_at) >= x.day_start
      and coalesce(h.signed_in_at,h.created_at) < x.day_end
  ) lh on true
  order by l.user_id;
$$;

revoke all on function private.planning_day_read_status_impl(date,date) from public, anon;
grant execute on function private.planning_day_read_status_impl(date,date) to authenticated;

create function public.planning_day_read_status(
  p_week_start date,
  p_day date
)
returns table(
  user_id uuid,
  day_date date,
  status_visible boolean,
  is_read boolean,
  read_at timestamptz,
  revision_at timestamptz
)
language sql
stable
set search_path=''
as $$
  select *
  from private.planning_day_read_status_impl(p_week_start,p_day);
$$;

revoke all on function public.planning_day_read_status(date,date) from public, anon;
grant execute on function public.planning_day_read_status(date,date) to authenticated;

-- Nethor — suivi de lecture planning : reset global à chaque modification/import.
-- Toute nouvelle révision invalide tous les statuts Lu de la semaine.
-- Chaque journée repasse ensuite à Lu uniquement si l'utilisateur se connecte ce jour-là
-- après la dernière révision du planning.

create or replace function private.capture_planning_day_revisions()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  i integer;
  d date;
  kind text := 'update';
begin
  if tg_op = 'INSERT' then
    kind := 'import';
  elsif old.imported_at is distinct from new.imported_at
     or old.source_path is distinct from new.source_path
     or old.source_file is distinct from new.source_file then
    kind := 'replace';
  else
    kind := 'update';
  end if;

  for i in 0..6 loop
    d := new.week_start + i;
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
  end loop;

  return new;
end;
$$;

revoke all on function private.capture_planning_day_revisions() from public, anon, authenticated;

create or replace function private.planning_day_read_status_impl(
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
    select max(h.signed_in_at) as read_at
    from public.login_history h
    where h.user_id=l.user_id
      and h.signed_in_at >= x.day_start
      and h.signed_in_at < x.day_end
  ) lh on true
  order by l.user_id;
$$;

revoke all on function private.planning_day_read_status_impl(date,date) from public, anon;
grant execute on function private.planning_day_read_status_impl(date,date) to authenticated;

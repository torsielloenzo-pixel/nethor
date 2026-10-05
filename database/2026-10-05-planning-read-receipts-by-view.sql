-- Nethor — accusés de consultation du planning par journée.
-- La lecture est créée par une vraie consultation :
-- - Accueil mobile => jour courant
-- - Planning mobile / desktop => jour actuellement affiché
-- Une révision du planning invalide automatiquement les lectures antérieures
-- via private.planning_day_revisions.

create table if not exists private.planning_read_receipts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null references public.planning_weeks(week_start) on delete cascade,
  day_date date not null,
  read_at timestamptz not null default now(),
  source text not null default 'planning',
  primary key(user_id,week_start,day_date),
  constraint planning_read_receipts_day_in_week
    check (day_date >= week_start and day_date <= week_start + 6)
);

alter table private.planning_read_receipts enable row level security;
revoke all on table private.planning_read_receipts from public, anon, authenticated;

create index if not exists planning_read_receipts_week_day_idx
  on private.planning_read_receipts (week_start,day_date,user_id);

drop function if exists public.planning_mark_day_read(date,text);
drop function if exists private.planning_mark_day_read_impl(date,text);

create function private.planning_mark_day_read_impl(
  p_day date,
  p_source text default 'planning'
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_week date;
  v_source text := lower(coalesce(nullif(btrim(p_source),''),'planning'));
  v_linked boolean := false;
begin
  if v_user is null then return false; end if;
  if not (select private.session_is_active()) then return false; end if;
  if not (select private.can_module(v_user,'planning','view')) then return false; end if;
  if p_day is null then return false; end if;

  v_week := p_day - ((extract(isodow from p_day)::int)-1);

  if v_source not in ('mobile_home','planning_mobile','planning_desktop','planning') then
    v_source := 'planning';
  end if;

  select exists(
    select 1
    from public.planning_weeks w
    join public.profiles p on p.id=v_user
    where w.week_start=v_week
      and exists(
        select 1
        from pg_catalog.jsonb_array_elements(coalesce(w.data->'employees','[]'::jsonb)) e
        where private.planning_name_key(e->>'name')=private.planning_name_key(p.display_name)
      )
  ) into v_linked;

  if not v_linked then return false; end if;

  insert into private.planning_read_receipts(user_id,week_start,day_date,read_at,source)
  values(v_user,v_week,p_day,pg_catalog.now(),v_source)
  on conflict(user_id,week_start,day_date)
  do update set read_at=excluded.read_at,source=excluded.source;

  return true;
end;
$$;

revoke all on function private.planning_mark_day_read_impl(date,text) from public, anon;
grant execute on function private.planning_mark_day_read_impl(date,text) to authenticated;

create function public.planning_mark_day_read(
  p_day date,
  p_source text default 'planning'
)
returns boolean
language sql
volatile
set search_path=''
as $$
  select private.planning_mark_day_read_impl(p_day,p_source);
$$;

revoke all on function public.planning_mark_day_read(date,text) from public, anon;
grant execute on function public.planning_mark_day_read(date,text) to authenticated;

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
    select p_week_start as week_start,p_day as day_date
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
    select w.week_start,w.data,w.updated_at,w.imported_at
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
    select coalesce(max(r.revision_at),max(w.updated_at),max(w.imported_at)) as revision_at
    from week_row w
    join params x on true
    left join private.planning_day_revisions r
      on r.week_start=w.week_start and r.day_date=x.day_date
  )
  select
    l.user_id,
    x.day_date,
    true as status_visible,
    (
      rr.read_at is not null
      and (rv.revision_at is null or rr.read_at >= rv.revision_at)
    ) as is_read,
    case
      when rr.read_at is not null and (rv.revision_at is null or rr.read_at >= rv.revision_at)
      then rr.read_at else null
    end as read_at,
    rv.revision_at
  from linked l
  cross join params x
  cross join revision rv
  left join private.planning_read_receipts rr
    on rr.user_id=l.user_id
   and rr.week_start=x.week_start
   and rr.day_date=x.day_date
  order by l.user_id;
$$;

revoke all on function private.planning_day_read_status_impl(date,date) from public, anon;
grant execute on function private.planning_day_read_status_impl(date,date) to authenticated;

drop function if exists public.planning_week_read_status(date);
drop function if exists private.planning_week_read_status_impl(date);

create function private.planning_week_read_status_impl(
  p_week_start date
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
  select s.user_id,s.day_date,s.status_visible,s.is_read,s.read_at,s.revision_at
  from pg_catalog.generate_series(0,6) g(i)
  cross join lateral private.planning_day_read_status_impl(p_week_start,p_week_start+g.i) s
  order by s.day_date,s.user_id;
$$;

revoke all on function private.planning_week_read_status_impl(date) from public, anon;
grant execute on function private.planning_week_read_status_impl(date) to authenticated;

create function public.planning_week_read_status(
  p_week_start date
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
  select * from private.planning_week_read_status_impl(p_week_start);
$$;

revoke all on function public.planning_week_read_status(date) from public, anon;
grant execute on function public.planning_week_read_status(date) to authenticated;

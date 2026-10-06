-- Nethor - accusé "Lu" lié à la version réellement affichée.
-- Les anciens clients (sans version) ne peuvent pas valider un planning remplacé.
-- Aucun accusé historique sans preuve de version n'est converti en "Lu".

alter table private.planning_read_receipts
  add column if not exists planning_version_at timestamptz;

create index if not exists planning_read_receipts_version_idx
  on private.planning_read_receipts(week_start,day_date,planning_version_at);

-- Compatibilité sécurisée : refuser les clients qui n'envoient pas de version.
create or replace function private.planning_mark_day_read_impl(
  p_day date,
  p_source text default 'planning'
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  return false;
end;
$$;

-- La lecture est enregistrée UNIQUEMENT si la version consultée est
-- encore celle publiée, vérifiée sous verrou contre un import concurrent.
create or replace function private.planning_mark_day_read_impl(
  p_day date,
  p_source text,
  p_revision_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_week date;
  v_source text := pg_catalog.lower(coalesce(nullif(pg_catalog.btrim(p_source),''),'planning'));
  v_version timestamptz;
  v_data jsonb;
  v_linked boolean := false;
begin
  if v_user is null or p_day is null or p_revision_at is null then return false; end if;
  if not (select private.session_is_active()) then return false; end if;
  if not (select private.can_module(v_user,'planning','view')) then return false; end if;

  v_week := p_day - (extract(isodow from p_day)::integer - 1);
  if v_source not in ('mobile_home','planning_mobile','planning_desktop','planning') then
    v_source := 'planning';
  end if;

  select w.updated_at,w.data into v_version,v_data
  from public.planning_weeks w
  where w.week_start=v_week
  for share;

  if not found or v_version is distinct from p_revision_at then return false; end if;

  select exists (
    select 1 from public.profiles p
    where p.id=v_user
      and exists(
        select 1
        from pg_catalog.jsonb_array_elements(coalesce(v_data->'employees','[]'::jsonb)) e
        where private.planning_name_key(e->>'name')=private.planning_name_key(p.display_name)
      )
  ) into v_linked;
  if not v_linked then return false; end if;

  insert into private.planning_read_receipts(
    user_id,week_start,day_date,read_at,source,planning_version_at
  )
  values (v_user,v_week,p_day,pg_catalog.now(),v_source,v_version)
  on conflict (user_id,week_start,day_date)
  do update set
    read_at=excluded.read_at,
    source=excluded.source,
    planning_version_at=excluded.planning_version_at;

  return true;
end;
$$;

revoke all on function private.planning_mark_day_read_impl(date,text,timestamptz) from public,anon;
grant execute on function private.planning_mark_day_read_impl(date,text,timestamptz) to authenticated;

create or replace function public.planning_mark_day_read(
  p_day date,
  p_source text,
  p_revision_at timestamptz
)
returns boolean
language sql
volatile
set search_path=''
as $$
  select private.planning_mark_day_read_impl(p_day,p_source,p_revision_at);
$$;

revoke all on function public.planning_mark_day_read(date,text,timestamptz) from public,anon;
grant execute on function public.planning_mark_day_read(date,text,timestamptz) to authenticated;

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
    select 1 from params x
    where (select auth.uid()) is not null
      and (select private.session_is_active())
      and (select private.can_module((select auth.uid()),'planning','manage'))
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
    from public.profiles p join week_row w on true
    where p.role <> 'admin'
      and exists(
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
      rr.planning_version_at is not null
      and rr.planning_version_at=w.updated_at
      and rr.read_at >= coalesce(rv.revision_at,w.updated_at)
    ) as is_read,
    case
      when rr.planning_version_at is not null
        and rr.planning_version_at=w.updated_at
        and rr.read_at >= coalesce(rv.revision_at,w.updated_at)
      then rr.read_at else null
    end as read_at,
    rv.revision_at
  from linked l
  cross join params x
  cross join revision rv
  cross join week_row w
  left join private.planning_read_receipts rr
    on rr.user_id=l.user_id
   and rr.week_start=x.week_start
   and rr.day_date=x.day_date
  order by l.user_id;
$$;

revoke all on function private.planning_day_read_status_impl(date,date) from public,anon;
grant execute on function private.planning_day_read_status_impl(date,date) to authenticated;

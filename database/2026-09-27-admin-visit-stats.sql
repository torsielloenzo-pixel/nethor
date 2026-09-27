-- Statistiques de fréquentation du portail pour le journal d'activité.
-- Les visites de comptes administrateurs sont exclues du graphique.

create or replace function public.admin_visit_stats(p_period text default 'week')
returns table(bucket_start timestamptz, visits bigint)
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  period_key text:=lower(coalesce(p_period,'week'));
  local_now timestamp:=timezone('Europe/Paris',now());
  local_start timestamp;
  local_end timestamp;
  step interval;
begin
  if not private.has_role(array['admin']) then
    raise exception 'Accès réservé à l''administrateur';
  end if;

  if period_key='day' then
    local_start:=date_trunc('day',local_now);
    local_end:=local_start+interval '1 day';
    step:=interval '1 hour';
  elsif period_key='month' then
    local_start:=date_trunc('month',local_now);
    local_end:=local_start+interval '1 month';
    step:=interval '1 day';
  else
    local_start:=date_trunc('week',local_now);
    local_end:=local_start+interval '7 days';
    step:=interval '1 day';
  end if;

  return query
  with buckets as (
    select g as bucket_local
    from generate_series(local_start,local_end-step,step) g
  )
  select
    (b.bucket_local at time zone 'Europe/Paris') as bucket_start,
    count(l.id)::bigint as visits
  from buckets b
  left join public.audit_logs l
    on l.action='view'
   and timezone('Europe/Paris',l.created_at)>=b.bucket_local
   and timezone('Europe/Paris',l.created_at)<b.bucket_local+step
   and exists(
     select 1 from public.profiles p
     where p.id=l.actor_id and p.role<>'admin'
   )
  group by b.bucket_local
  order by b.bucket_local;
end
$$;

revoke all on function public.admin_visit_stats(text) from public,anon;
grant execute on function public.admin_visit_stats(text) to authenticated;

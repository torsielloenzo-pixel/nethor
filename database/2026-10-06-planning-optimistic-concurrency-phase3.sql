-- Nethor Phase 3 — Ecriture conditionnelle et atomique du planning.
-- Une version de semaine est un updated_at émis par le serveur, jamais l'heure du navigateur.
-- SECURITY DEFINER est volontaire: les modifications directes sont révoquées aux clients.
-- Les deux RPC exigent explicitement session active et permission planning/manage.
create or replace function public.planning_save_week_if_revision(
  p_week_start date,
  p_expected_revision timestamptz,
  p_data jsonb,
  p_employee_order jsonb,
  p_week_label text,
  p_source_file text,
  p_source_path text,
  p_imported_at timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_saved_revision timestamptz;
  v_current_revision timestamptz;
begin
  if v_actor is null
     or not (select private.session_is_active())
     or not (select private.can_module(v_actor,'planning','manage')) then
    return pg_catalog.jsonb_build_object('status','forbidden');
  end if;
  if p_week_start is null
     or extract(isodow from p_week_start)::integer <> 1
     or p_data is null
     or coalesce(p_data->>'version','') not in ('3','4')
     or p_data->>'weekStart' is distinct from p_week_start::text
     or pg_catalog.jsonb_typeof(p_data->'employees') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_data->'days') is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_employee_order) is distinct from 'array' then
    return pg_catalog.jsonb_build_object('status','invalid');
  end if;

  if p_expected_revision is null then
    insert into public.planning_weeks(
      week_start,data,employee_order,week_label,source_file,source_path,
      imported,imported_at,updated_by
    )
    values (
      p_week_start,p_data,p_employee_order,p_week_label,p_source_file,p_source_path,
      true,coalesce(p_imported_at,pg_catalog.clock_timestamp()),v_actor
    )
    on conflict (week_start) do nothing
    returning updated_at into v_saved_revision;
  else
    -- L'UPDATE prend un verrou ligne et re-vérifie WHERE après toute écriture
    -- concurrente. Une version dépassée ne peut plus remplacer la dernière.
    update public.planning_weeks
       set data=p_data,
           employee_order=p_employee_order,
           week_label=p_week_label,
           source_file=p_source_file,
           source_path=p_source_path,
           imported=true,
           imported_at=coalesce(p_imported_at,imported_at,pg_catalog.clock_timestamp()),
           updated_by=v_actor
     where week_start=p_week_start
       and updated_at=p_expected_revision
    returning updated_at into v_saved_revision;
  end if;

  if v_saved_revision is null then
    select updated_at into v_current_revision
    from public.planning_weeks
    where week_start=p_week_start;
    return pg_catalog.jsonb_build_object(
      'status','conflict',
      'current_revision',v_current_revision
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'status','ok',
    'revision',v_saved_revision
  );
end;
$$;
revoke all on function public.planning_save_week_if_revision(
  date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.planning_save_week_if_revision(
  date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) to authenticated;

create or replace function public.planning_delete_week_if_revision(
  p_week_start date,
  p_expected_revision timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_deleted_revision timestamptz;
  v_current_revision timestamptz;
begin
  if v_actor is null
     or not (select private.session_is_active())
     or not (select private.can_module(v_actor,'planning','manage')) then
    return pg_catalog.jsonb_build_object('status','forbidden');
  end if;
  if p_week_start is null or p_expected_revision is null
     or extract(isodow from p_week_start)::integer <> 1 then
    return pg_catalog.jsonb_build_object('status','invalid');
  end if;

  delete from public.planning_weeks
   where week_start=p_week_start
     and updated_at=p_expected_revision
  returning updated_at into v_deleted_revision;

  if v_deleted_revision is null then
    select updated_at into v_current_revision
    from public.planning_weeks
    where week_start=p_week_start;
    return pg_catalog.jsonb_build_object(
      'status','conflict',
      'current_revision',v_current_revision
    );
  end if;
  return pg_catalog.jsonb_build_object('status','ok');
end;
$$;
revoke all on function public.planning_delete_week_if_revision(
  date,timestamptz
) from public,anon,authenticated;
grant execute on function public.planning_delete_week_if_revision(
  date,timestamptz
) to authenticated;

-- Fermer toute voie de contournement (anciens onglets, clients non à jour,
-- requêtes REST directes). L'accès lecture et ses règles RLS restent inchangés.
-- Les rôles privilégiés serveur conservent leurs droits; seul authenticated
-- perd la modification directe des semaines.
revoke insert,update,delete on public.planning_weeks from authenticated;

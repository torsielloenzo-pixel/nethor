-- Nethor phase 3 : seules des façades SECURITY INVOKER sont exposées dans public.
-- La logique d'écriture SECURITY DEFINER reste dans le schema private.
-- API et signatures des clients inchangées ; aucune donnée métier n'est modifiée.

alter function public.planning_save_week_if_revision(
 date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) set schema private;

alter function public.planning_delete_week_if_revision(
 date,timestamptz
) set schema private;

revoke all on function private.planning_save_week_if_revision(
 date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) from public,anon,authenticated;
grant execute on function private.planning_save_week_if_revision(
 date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) to authenticated;

revoke all on function private.planning_delete_week_if_revision(
 date,timestamptz
) from public,anon,authenticated;
grant execute on function private.planning_delete_week_if_revision(
 date,timestamptz
) to authenticated;

create function public.planning_save_week_if_revision(
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
language sql
volatile
security invoker
set search_path=''
as $$
 select private.planning_save_week_if_revision(
  p_week_start,p_expected_revision,p_data,p_employee_order,p_week_label,
  p_source_file,p_source_path,p_imported_at
 );
$$;

create function public.planning_delete_week_if_revision(
 p_week_start date,
 p_expected_revision timestamptz
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
 select private.planning_delete_week_if_revision(p_week_start,p_expected_revision);
$$;

revoke all on function public.planning_save_week_if_revision(
 date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.planning_save_week_if_revision(
 date,timestamptz,jsonb,jsonb,text,text,text,timestamptz
) to authenticated;

revoke all on function public.planning_delete_week_if_revision(
 date,timestamptz
) from public,anon,authenticated;
grant execute on function public.planning_delete_week_if_revision(
 date,timestamptz
) to authenticated;

-- Resynchroniser le cache de schéma de l'API sans attendre le prochain cycle.
notify pgrst, 'reload schema';

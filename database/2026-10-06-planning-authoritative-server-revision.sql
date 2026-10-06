-- Nethor - autorite serveur pour la version du planning.
-- L'horodatage updated_at existant est utilise par les accusés Lu.
-- Un navigateur avec une horloge mal reglee ne doit pas imposer sa version.
create or replace function private.planning_weeks_server_version()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := pg_catalog.clock_timestamp();
  elsif new.data is distinct from old.data
     or new.employee_order is distinct from old.employee_order
     or new.week_label is distinct from old.week_label
     or new.source_file is distinct from old.source_file
     or new.source_path is distinct from old.source_path
     or new.imported is distinct from old.imported
     or new.imported_at is distinct from old.imported_at then
    new.updated_at := greatest(pg_catalog.clock_timestamp(), old.updated_at + interval '1 microsecond');
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
revoke all on function private.planning_weeks_server_version() from public, anon, authenticated;
drop trigger if exists planning_weeks_server_revision_before_write on public.planning_weeks;
create trigger planning_weeks_server_revision_before_write
before insert or update on public.planning_weeks
for each row execute function private.planning_weeks_server_version();

-- Historique permanent des imports Excel du Planning.
-- La liste et le téléchargement sont réservés à l'administrateur.
-- Les imports antérieurs à l'archivage sont conservés dans l'historique avec storage_path = null.

create table if not exists public.planning_import_history (
  id bigint generated always as identity primary key,
  week_start date not null,
  file_name text not null,
  storage_path text unique,
  imported_at timestamptz not null default now(),
  imported_by uuid references public.profiles(id) on delete set null,
  imported_by_name text not null default 'Utilisateur',
  ip_address inet,
  file_size bigint check (file_size is null or file_size >= 0),
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists planning_import_history_imported_at_idx
  on public.planning_import_history(imported_at desc);

create index if not exists planning_import_history_imported_by_idx
  on public.planning_import_history(imported_by);

alter table public.planning_import_history enable row level security;

revoke all on table public.planning_import_history from anon;
revoke all on table public.planning_import_history from authenticated;
grant select on table public.planning_import_history to authenticated;

drop policy if exists "planning import history admin read" on public.planning_import_history;
create policy "planning import history admin read"
on public.planning_import_history
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create or replace function private.capture_planning_import_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_display_name text;
begin
  if new.source_path is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.source_path is not distinct from old.source_path then
    return new;
  end if;

  select p.display_name
  into v_display_name
  from public.profiles p
  where p.id = new.updated_by;

  insert into public.planning_import_history(
    week_start,
    file_name,
    storage_path,
    imported_at,
    imported_by,
    imported_by_name
  )
  values (
    new.week_start,
    coalesce(nullif(new.source_file,''), 'Planning ' || new.week_start::text),
    new.source_path,
    coalesce(new.imported_at, now()),
    new.updated_by,
    coalesce(nullif(v_display_name,''), 'Utilisateur')
  )
  on conflict (storage_path) do update
  set week_start = excluded.week_start,
      file_name = excluded.file_name,
      imported_at = excluded.imported_at,
      imported_by = excluded.imported_by,
      imported_by_name = excluded.imported_by_name;

  return new;
end
$$;

drop trigger if exists planning_import_history_capture on public.planning_weeks;
create trigger planning_import_history_capture
after insert or update of source_path on public.planning_weeks
for each row
execute function private.capture_planning_import_history();

insert into public.planning_import_history(
  week_start,
  file_name,
  storage_path,
  imported_at,
  imported_by,
  imported_by_name,
  file_size,
  mime_type
)
select
  w.week_start,
  coalesce(nullif(w.source_file,''), 'Planning ' || w.week_start::text),
  w.source_path,
  coalesce(w.imported_at,w.updated_at,now()),
  w.updated_by,
  coalesce(nullif(p.display_name,''),'Utilisateur'),
  case
    when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
    else null
  end,
  nullif(o.metadata->>'mimetype','')
from public.planning_weeks w
left join public.profiles p on p.id = w.updated_by
left join storage.objects o
  on o.bucket_id = 'planning-files'
 and o.name = w.source_path
where w.imported is true
  and w.source_file is not null
  and not exists (
    select 1
    from public.planning_import_history h
    where h.week_start = w.week_start
      and h.file_name = w.source_file
      and h.imported_at = coalesce(w.imported_at,w.updated_at)
  );

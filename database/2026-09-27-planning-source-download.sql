-- Archive le fichier Excel source de chaque semaine de planning.
-- Les rôles ayant la gestion du planning peuvent importer/remplacer le fichier.
-- La lecture/téléchargement du fichier brut est réservée à l'administrateur.

alter table public.planning_weeks
add column if not exists source_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'planning-files',
  'planning-files',
  false,
  20971520,
  array[
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
    'application/octet-stream'
  ]
)
on conflict(id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "planning files manage upload" on storage.objects;
drop policy if exists "planning files manage update" on storage.objects;
drop policy if exists "planning files manage delete" on storage.objects;
drop policy if exists "planning files admin read" on storage.objects;

create policy "planning files manage upload"
on storage.objects
for insert to authenticated
with check (
  bucket_id='planning-files'
  and private.can_module((select auth.uid()),'planning','manage')
);

create policy "planning files manage update"
on storage.objects
for update to authenticated
using (
  bucket_id='planning-files'
  and private.can_module((select auth.uid()),'planning','manage')
)
with check (
  bucket_id='planning-files'
  and private.can_module((select auth.uid()),'planning','manage')
);

create policy "planning files manage delete"
on storage.objects
for delete to authenticated
using (
  bucket_id='planning-files'
  and private.can_module((select auth.uid()),'planning','manage')
);

create policy "planning files admin read"
on storage.objects
for select to authenticated
using (
  bucket_id='planning-files'
  and exists(
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role='admin'
  )
);

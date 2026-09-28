-- Nethor storage hardening — 2026-09-28
-- Align bucket restrictions with the formats already accepted by the UI,
-- and restrict chat attachments to conversations the current user may read.

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'
    ]::text[]
where id = 'product-images';

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif',
  'image/svg+xml','image/x-icon','image/vnd.microsoft.icon'
]::text[]
where id = 'portal-assets';

drop policy if exists "chat_files_read" on storage.objects;
create policy "chat_files_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-files'
  and (
    private.has_role(array['admin'])
    or case
      when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then private.chat_can_read(((storage.foldername(name))[2])::uuid, auth.uid())
      else false
    end
  )
);

drop policy if exists "chat_files_upload" on storage.objects;
create policy "chat_files_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (
    private.has_role(array['admin'])
    or case
      when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then private.chat_can_read(((storage.foldername(name))[2])::uuid, auth.uid())
      else false
    end
  )
);

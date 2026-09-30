-- Nethor • Synchronisation automatique du Journal des modifications
-- 2026-09-30
--
-- Source de vérité des versions : app-version.json publié sur GitHub Pages.
-- Le job serveur vérifie la version toutes les 5 minutes et met à jour une
-- entrée AUTO unique par build grâce à portal_change_logs.event_key.
-- L'historique 180 → 248 a été restauré séparément lors du déploiement initial.

create extension if not exists http with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.sync_nethor_release_manifest()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  manifest jsonb;
  v_version integer;
  v_label text;
  v_title text;
  v_message text;
  v_published timestamptz;
  v_event_key text;
  v_release_type text;
begin
  select h.status, h.content
    into r
  from extensions.http_get(
    'https://torsielloenzo-pixel.github.io/nethor/app-version.json?journal_sync=' ||
    floor(extract(epoch from clock_timestamp()))::bigint::text
  ) as h;

  if r.status <> 200 or r.content is null then
    return jsonb_build_object('ok', false, 'status', r.status);
  end if;

  begin
    manifest := r.content::jsonb;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'invalid_manifest_json');
  end;

  v_version := nullif(manifest->>'version', '')::integer;
  if v_version is null or v_version <= 0 then
    return jsonb_build_object('ok', false, 'error', 'missing_version');
  end if;

  v_label := coalesce(nullif(manifest->>'label', ''), 'Build ' || v_version::text);
  v_title := coalesce(nullif(manifest->>'title', ''), 'Nouvelle version de Nethor');
  v_message := coalesce(nullif(manifest->>'message', ''), 'Mise à jour publiée.');
  v_event_key := 'release:' || v_version::text;
  v_release_type := case
    when coalesce((manifest->>'important')::boolean, false) then 'maj'
    else 'patch'
  end;

  begin
    v_published := nullif(manifest->>'published_at', '')::timestamptz;
  exception when others then
    v_published := now();
  end;
  v_published := coalesce(v_published, now());

  insert into public.portal_change_logs(
    event_key,
    source,
    release_type,
    title,
    description,
    area,
    actor_id,
    actor_name,
    details,
    created_at
  )
  values(
    v_event_key,
    'auto',
    v_release_type,
    v_title,
    v_message,
    'Mise à jour',
    null,
    'AUTO',
    jsonb_build_object(
      'version', v_version,
      'label', v_label,
      'important', coalesce((manifest->>'important')::boolean, false),
      'clear_cache', coalesce((manifest->>'clear_cache')::boolean, false),
      'mode', coalesce(manifest->>'mode', 'manual'),
      'icon', manifest->>'icon',
      'published_at', manifest->>'published_at',
      'source', 'app-version.json',
      'auto_synced', true
    ),
    v_published
  )
  on conflict (event_key) do update set
    source = excluded.source,
    release_type = excluded.release_type,
    title = excluded.title,
    description = excluded.description,
    area = excluded.area,
    actor_name = excluded.actor_name,
    details = excluded.details,
    created_at = excluded.created_at;

  return jsonb_build_object(
    'ok', true,
    'version', v_version,
    'label', v_label,
    'event_key', v_event_key
  );
end;
$$;

revoke all on function private.sync_nethor_release_manifest() from public, anon, authenticated;

create or replace function public.sync_nethor_release_manifest()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_role(array['admin']) then
    raise exception 'Accès administrateur requis';
  end if;

  return private.sync_nethor_release_manifest();
end;
$$;

revoke all on function public.sync_nethor_release_manifest() from public, anon;
grant execute on function public.sync_nethor_release_manifest() to authenticated;

select cron.schedule(
  'nethor-release-journal-sync',
  '*/5 * * * *',
  $cron$select private.sync_nethor_release_manifest();$cron$
);

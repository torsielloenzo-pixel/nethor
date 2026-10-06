-- Phase 1 - Nethor: rendre fonctionnels les abonnements Postgres Changes
-- déjà présents dans Planning et Accueil mobile.
--
-- Ne change ni les droits des utilisateurs ni les politiques RLS.
-- Supabase Realtime doit encore autoriser la lecture de la ligne par RLS.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='planning_weeks'
  ) then
    alter publication supabase_realtime add table public.planning_weeks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='planning_absences'
  ) then
    alter publication supabase_realtime add table public.planning_absences;
  end if;
end
$$;

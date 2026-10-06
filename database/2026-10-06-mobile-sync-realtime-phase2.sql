-- Phase 2: activer les tables réellement écoutées par les interfaces mobiles.
-- RLS et droits existants restent inchangés ; publication idempotente.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['daily_tasks','daily_task_assignees','daily_task_completions','user_subroles','subrole_module_permissions','notification_preferences','notification_rules'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=v_table
    ) then
      execute pg_catalog.format('alter publication supabase_realtime add table public.%I',v_table);
    end if;
  end loop;
end $$;

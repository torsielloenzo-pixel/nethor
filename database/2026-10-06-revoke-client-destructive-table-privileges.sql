-- Phase 3 : empecher toute destruction directe de tables par les roles clients.
-- TRUNCATE contourne les controles RLS et ne declenche pas les triggers par ligne.
-- TRIGGER et REFERENCES sont des privileges de schema, pas des operations metier
-- necessaires aux clients Nethor. Garder SELECT / INSERT / UPDATE / DELETE intacts.
--
-- Ne modifie pas le service_role, les policies RLS ou les fonctions RPC.
do $migration$
declare
  target record;
begin
  for target in
    select n.nspname as schema_name,c.relname as table_name
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind in ('r','p')
  loop
    execute pg_catalog.format(
      'revoke truncate, trigger, references on table %I.%I from public, anon, authenticated',
      target.schema_name,target.table_name
    );
  end loop;

  if exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
      and (
        pg_catalog.has_table_privilege('anon',c.oid,'TRUNCATE')
        or pg_catalog.has_table_privilege('authenticated',c.oid,'TRUNCATE')
        or pg_catalog.has_table_privilege('anon',c.oid,'TRIGGER')
        or pg_catalog.has_table_privilege('authenticated',c.oid,'TRIGGER')
        or pg_catalog.has_table_privilege('anon',c.oid,'REFERENCES')
        or pg_catalog.has_table_privilege('authenticated',c.oid,'REFERENCES')
      )
  ) then
    raise exception 'Client database privileges remain unsafe after migration';
  end if;
end;
$migration$;

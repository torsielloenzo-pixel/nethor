-- Phase 5 : verrouiller le journal technique sur le rôle Administrateur réel.
-- Le niveau de permission portal_admin/manage seul peut être délégué dans
-- l'outil de gestion ; il ne doit pas exposer les journaux des autres comptes.
-- Conserve le contrôle de session active et la permission métier existants.
drop policy if exists nethor_health_admin_select on public.nethor_client_health_events;
create policy nethor_health_admin_select on public.nethor_client_health_events
 for select to authenticated
 using (
  (select private.session_is_active())
  and (select private.can_module((select auth.uid()),'portal_admin','manage'))
  and exists (
   select 1 from public.profiles p
   where p.id=(select auth.uid()) and p.role='admin'
  )
 );

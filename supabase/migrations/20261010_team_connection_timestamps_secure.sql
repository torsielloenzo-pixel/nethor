-- Nethor · Dates de connexion et dernière activité
-- Les timestamps sont déjà enregistrés par PostgreSQL (timestamptz, UTC).
-- Aucune date historique n'est réécrite ou estimée.
create or replace function public.team_connection_times()
returns table (
 user_id uuid,
 last_login_at timestamptz,
 last_seen_at timestamptz,
 online_since timestamptz
)
language plpgsql
stable security definer
set search_path = ''
as $function$
declare
 requester uuid := (select auth.uid());
 can_see_team boolean := false;
begin
 if requester is null or not (select private.session_is_active()) then
  raise exception 'Session non autorisée' using errcode='42501';
 end if;

 can_see_team := (select private.can_module(requester,'chat','view'))
                 or (select private.has_role(array['admin'::text]));

 return query
 select p.id, log_data.last_login_at, presence.last_seen_at, presence.online_since
 from public.profiles p
 left join (
  select lh.user_id, max(lh.signed_in_at) as last_login_at
  from public.login_history lh
  group by lh.user_id
 ) as log_data on log_data.user_id=p.id
 left join public.chat_presence_history as presence on presence.user_id=p.id
 where (can_see_team or p.id=requester)
   and p.account_enabled is distinct from false;
end
$function$;
revoke all on function public.team_connection_times() from public,anon;
grant execute on function public.team_connection_times() to authenticated;
comment on function public.team_connection_times() is
 'Connection timestamps without user agent; active session only. Team view requires chat permission or admin role; other users can access own data.';
-- NETHOR SECURITY STAGE 16: REVIEW-ONLY, NOT DEPLOYED.
-- Live Supabase project: gioxrpaiwogqqtakjpnv (the definitions below were read, not modified).
-- THIS FILE IS NOT AN AUTOMATIC MIGRATION. Do not execute until code review,
-- staging role/session tests, full-function comparison and an approved deployment.
-- The preflight MD5s reject changes made to the functions after this audit.
-- BEGIN/COMMIT make failure atomic if the reviewed script is later executed.
-- No GRANT, REVOKE, RLS policy, table data or auth session change is in this proposal.

BEGIN;
DO $nethor_preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('private.list_team_members_impl()') AND md5(pg_get_functiondef(p.oid)) = '4742b22fcc2712e16a947f534d06dc1b') THEN
    RAISE EXCEPTION 'Function changed since audit: private.list_team_members_impl';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('private.chat_can_manage(uuid,uuid)') AND md5(pg_get_functiondef(p.oid)) = '80b7d03e21b17bdc4b0df3cab9e9fece') THEN
    RAISE EXCEPTION 'Function changed since audit: private.chat_can_manage';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.admin_notification_rules()') AND md5(pg_get_functiondef(p.oid)) = '8e4d4a5d6fa94fbb8aace3dd6b9c863c') THEN
    RAISE EXCEPTION 'Function changed since audit: public.admin_notification_rules';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.admin_notification_users()') AND md5(pg_get_functiondef(p.oid)) = '869bdf6d4788274a2459f18e549cfebb') THEN
    RAISE EXCEPTION 'Function changed since audit: public.admin_notification_users';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.chat_presence_ping(text)') AND md5(pg_get_functiondef(p.oid)) = '6d8e2a317d78864d1c7d4c989501ba02') THEN
    RAISE EXCEPTION 'Function changed since audit: public.chat_presence_ping';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.chat_mark_all_read()') AND md5(pg_get_functiondef(p.oid)) = 'ae55a18512292d98baaea2a6137a8ac3') THEN
    RAISE EXCEPTION 'Function changed since audit: public.chat_mark_all_read';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.chat_mark_read(uuid)') AND md5(pg_get_functiondef(p.oid)) = 'ef890c54cc73edda81e629e2878b3fee') THEN
    RAISE EXCEPTION 'Function changed since audit: public.chat_mark_read';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.chat_set_muted(uuid,boolean)') AND md5(pg_get_functiondef(p.oid)) = '7bb166569683ce3b1192db669ad11ee6') THEN
    RAISE EXCEPTION 'Function changed since audit: public.chat_set_muted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.chat_set_user_conversation_state(uuid,text)') AND md5(pg_get_functiondef(p.oid)) = '0deb2d53ce796fb51b59419d6d4f8176') THEN
    RAISE EXCEPTION 'Function changed since audit: public.chat_set_user_conversation_state';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.my_subrole_keys()') AND md5(pg_get_functiondef(p.oid)) = '4c67f89cb48a7ea207e784abf4599359') THEN
    RAISE EXCEPTION 'Function changed since audit: public.my_subrole_keys';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.my_subrole_permissions()') AND md5(pg_get_functiondef(p.oid)) = '097563f07579756508ec586bb0dce1c8') THEN
    RAISE EXCEPTION 'Function changed since audit: public.my_subrole_permissions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.weekly_poll_results(uuid)') AND md5(pg_get_functiondef(p.oid)) = 'dd091f0b346b8b0da4663d9c137e4470') THEN
    RAISE EXCEPTION 'Function changed since audit: public.weekly_poll_results';
  END IF;
END
$nethor_preflight$;

-- private.list_team_members_impl()
CREATE OR REPLACE FUNCTION private.list_team_members_impl()
 RETURNS TABLE(id uuid, display_name text, role text, avatar_path text, status_text text, profile_color text, avatar_frame text, contract_hours numeric, planning_name text, account_enabled boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    p.id,p.display_name,p.role,p.avatar_path,p.status_text,p.profile_color,
    p.avatar_frame,p.contract_hours,p.planning_name,p.account_enabled
  from public.profiles p
  where (select auth.uid()) is not null
    and (select private.session_is_active())
    and (p.role <> 'admin' or nullif(btrim(p.planning_name),'') is not null)
  order by coalesce(p.planning_name,p.display_name,'');
$function$;

-- private.chat_can_manage(uuid,uuid)
CREATE OR REPLACE FUNCTION private.chat_can_manage(p_conversation uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    private.session_is_active()
    and p_user = (select auth.uid())
    and (
    exists(select 1 from public.profiles p where p.id=p_user and p.role='admin')
    or exists(
      select 1 from public.chat_participants cp
      where cp.conversation_id=p_conversation and cp.user_id=p_user and cp.role='owner'
    )
    )
$function$;

-- public.admin_notification_rules()
CREATE OR REPLACE FUNCTION public.admin_notification_rules()
 RETURNS TABLE(rule_key text, label text, description text, trigger_text text, enabled boolean, push_allowed boolean, portal_enabled boolean, push_enabled boolean, sort_order integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select
   r.key,
   r.label,
   r.description,
   r.trigger_text,
   r.enabled,
   r.push_allowed,
   r.portal_enabled,
   (r.push_allowed and r.push_enabled) as push_enabled,
   r.sort_order
 from public.notification_rules r
 where (select private.session_is_active()) and exists(
   select 1
   from public.profiles p
   where p.id=(select auth.uid()) and p.role='admin'
 )
 order by r.sort_order,r.label
$function$;

-- public.admin_notification_users()
CREATE OR REPLACE FUNCTION public.admin_notification_users()
 RETURNS TABLE(id uuid, display_name text, role text, enabled boolean, devices bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id,
         p.display_name,
         p.role,
         coalesce(n.enabled, true) as enabled,
         (select count(*) from public.push_subscriptions s where s.user_id = p.id) as devices
  from public.profiles p
  left join public.notification_controls n on n.user_id = p.id
  where (select private.session_is_active()) and exists (
    select 1 from public.profiles me
    where me.id = auth.uid() and me.role = 'admin'
  )
  order by p.display_name nulls last;
$function$;

-- public.chat_presence_ping(text)
CREATE OR REPLACE FUNCTION public.chat_presence_ping(p_event text DEFAULT 'heartbeat'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := auth.uid();
  now_at timestamptz := now();
  row_data public.chat_presence_history%rowtype;
  elapsed bigint := 0;
begin
  if not (select private.session_is_active()) then
    raise exception 'Session inactive' using errcode='42501';
  end if;
  if uid is null then raise exception 'not allowed'; end if;

  select * into row_data
  from public.chat_presence_history
  where user_id=uid
  for update;

  if not found then
    insert into public.chat_presence_history(user_id,online_since,last_seen_at,updated_at)
    values(uid,case when p_event='end' then null else now_at end,now_at,now_at);
    return;
  end if;

  -- Une interruption supérieure à 2 minutes clôt la session précédente
  -- lors du retour suivant. On conserve ainsi la durée même après fermeture
  -- brutale du navigateur.
  if p_event<>'end'
     and row_data.online_since is not null
     and row_data.last_seen_at < now_at - interval '2 minutes' then
    elapsed := greatest(0,extract(epoch from (row_data.last_seen_at-row_data.online_since))::bigint);
    update public.chat_presence_history
       set last_session_seconds=elapsed,
           total_online_seconds=total_online_seconds+elapsed,
           online_since=now_at,
           last_seen_at=now_at,
           updated_at=now_at
     where user_id=uid;
    return;
  end if;

  if p_event='end' then
    elapsed := case when row_data.online_since is null then 0
                    else greatest(0,extract(epoch from (now_at-row_data.online_since))::bigint) end;
    update public.chat_presence_history
       set last_session_seconds=elapsed,
           total_online_seconds=total_online_seconds+elapsed,
           online_since=null,
           last_seen_at=now_at,
           updated_at=now_at
     where user_id=uid;
    return;
  end if;

  update public.chat_presence_history
     set online_since=coalesce(online_since,now_at),
         last_seen_at=now_at,
         updated_at=now_at
   where user_id=uid;
end $function$;

-- public.chat_mark_all_read()
CREATE OR REPLACE FUNCTION public.chat_mark_all_read()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); changed integer:=0; general_id uuid;
begin
  if not (select private.session_is_active()) then
    raise exception 'Session inactive' using errcode='42501';
  end if;
  if uid is null then return 0; end if;

  update public.chat_participants cp
     set last_read_at=now()
   where cp.user_id=uid
     and exists(select 1 from public.chat_conversations c where c.id=cp.conversation_id and c.archived_at is null);
  get diagnostics changed=row_count;

  select id into general_id from public.chat_conversations where type='general' and archived_at is null order by created_at limit 1;
  if general_id is not null then
    insert into public.chat_participants(conversation_id,user_id,role,last_read_at)
    values(general_id,uid,'member',now())
    on conflict(conversation_id,user_id) do update set last_read_at=excluded.last_read_at;
  end if;
  return changed;
end
$function$;

-- public.chat_mark_read(uuid)
CREATE OR REPLACE FUNCTION public.chat_mark_read(p_conversation uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid:=auth.uid();
  ctype text;
  is_admin boolean:=false;
begin
  if not (select private.session_is_active()) then
    raise exception 'Session inactive' using errcode='42501';
  end if;
  if uid is null then return; end if;

  select type into ctype
  from public.chat_conversations
  where id=p_conversation;

  if ctype is null then return; end if;

  select private.has_role(array['admin']) into is_admin;

  if is_admin then
    delete from public.chat_messages
    where conversation_id=p_conversation
      and deleted_at is not null;
  end if;

  if ctype='general' then
    insert into public.chat_participants(conversation_id,user_id,role,last_read_at)
    values (p_conversation,uid,'member',now())
    on conflict (conversation_id,user_id)
    do update set last_read_at=excluded.last_read_at;
  elsif private.chat_is_participant(p_conversation,uid) then
    update public.chat_participants
    set last_read_at=now()
    where conversation_id=p_conversation
      and user_id=uid;
  end if;
end
$function$;

-- public.chat_set_muted(uuid,boolean)
CREATE OR REPLACE FUNCTION public.chat_set_muted(p_conversation uuid, p_muted boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();
begin
  if not (select private.session_is_active()) then
    raise exception 'Session inactive' using errcode='42501';
  end if;
  if uid is null or not private.chat_can_read(p_conversation,uid) then raise exception 'not allowed'; end if;
  insert into public.chat_participants(conversation_id,user_id,role,muted)
  select p_conversation,uid,'member',coalesce(p_muted,false)
  where exists(select 1 from public.chat_conversations where id=p_conversation and type='general')
  on conflict (conversation_id,user_id) do update set muted=excluded.muted;
  update public.chat_participants
    set muted=coalesce(p_muted,false)
    where conversation_id=p_conversation and user_id=uid;
end $function$;

-- public.chat_set_user_conversation_state(uuid,text)
CREATE OR REPLACE FUNCTION public.chat_set_user_conversation_state(p_conversation uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid:=auth.uid();
  conv_type text;
begin
  if not (select private.session_is_active()) then
    raise exception 'Session inactive' using errcode='42501';
  end if;
  if uid is null then raise exception 'not allowed'; end if;
  if not private.chat_can_read(p_conversation,uid) then raise exception 'not allowed'; end if;
  if p_action not in ('archive','hide','restore') then raise exception 'invalid action'; end if;

  select c.type into conv_type
  from public.chat_conversations c
  where c.id=p_conversation;

  if conv_type in ('general','direct') and p_action in ('archive','hide') then
    raise exception 'conversation is permanent';
  end if;

  insert into public.chat_user_conversation_state(user_id,conversation_id,archived_at,hidden_at,updated_at)
  values(
    uid,p_conversation,
    case when p_action='archive' then now() else null end,
    case when p_action='hide' then now() else null end,
    now()
  )
  on conflict(user_id,conversation_id) do update
  set archived_at=case
        when p_action='archive' then now()
        when p_action in ('hide','restore') then null
        else public.chat_user_conversation_state.archived_at
      end,
      hidden_at=case
        when p_action='hide' then now()
        when p_action in ('archive','restore') then null
        else public.chat_user_conversation_state.hidden_at
      end,
      updated_at=now();
end
$function$;

-- public.my_subrole_keys()
CREATE OR REPLACE FUNCTION public.my_subrole_keys()
 RETURNS TABLE(subrole_key text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select us.subrole_key
  from public.user_subroles us
  where us.user_id=(select auth.uid())
    and (select private.session_is_active())
  order by us.subrole_key
$function$;

-- public.my_subrole_permissions()
CREATE OR REPLACE FUNCTION public.my_subrole_permissions()
 RETURNS TABLE(module text, permission text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.module,
         case
           when bool_or(p.permission='manage') then 'manage'
           when bool_or(p.permission='operate') then 'operate'
           else 'view'
         end as permission
  from public.user_subroles us
  join public.subrole_module_permissions p on p.subrole_key=us.subrole_key
  where us.user_id=(select auth.uid())
    and (select private.session_is_active())
  group by p.module
$function$;

-- public.weekly_poll_results(uuid)
CREATE OR REPLACE FUNCTION public.weekly_poll_results(p_poll_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p_end date; n bigint; details jsonb;
begin
  if not (select private.session_is_active()) then
    raise exception 'Session inactive' using errcode='42501';
  end if;
 if (select auth.uid()) is null or not exists (
   select 1 from public.profiles me where me.id=(select auth.uid()) and me.account_enabled is distinct from false
 ) then raise exception 'Accès refusé' using errcode='42501'; end if;
 select p.end_on into p_end from public.weekly_polls p where p.id=p_poll_id;
 if not found then raise exception 'Sondage introuvable' using errcode='22023'; end if;
 select count(*) into n from public.weekly_poll_votes v where v.poll_id=p_poll_id;
 if ((now() at time zone 'Europe/Paris')::date <= p_end) or n<5 then
   return jsonb_build_object('available',false,'total',null,'options','[]'::jsonb);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'count',(
  select count(*) from public.weekly_poll_votes v where v.poll_id=p_poll_id and v.option_id=o.id
 )) order by o.position),'[]'::jsonb)
 into details from public.weekly_poll_options o where o.poll_id=p_poll_id;
 return jsonb_build_object('available',true,'total',n,'options',details);
end;$function$;

COMMIT;

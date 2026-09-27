-- Nethor — contrôle indépendant des canaux de notification
-- État final correspondant à la release v1.35.

alter table public.notification_preferences
  add column if not exists push_enabled boolean,
  add column if not exists portal_enabled boolean;

update public.notification_preferences
set push_enabled=coalesce(push_enabled,enabled),
    portal_enabled=coalesce(portal_enabled,true)
where push_enabled is null or portal_enabled is null;

alter table public.notification_preferences
  alter column push_enabled set default true,
  alter column push_enabled set not null,
  alter column portal_enabled set default true,
  alter column portal_enabled set not null;

alter table public.notification_rules
  add column if not exists portal_enabled boolean,
  add column if not exists push_enabled boolean;

update public.notification_rules
set portal_enabled=coalesce(portal_enabled,enabled),
    push_enabled=coalesce(push_enabled,enabled and push_allowed)
where portal_enabled is null or push_enabled is null;

update public.notification_rules
set push_enabled=false
where push_allowed=false;

alter table public.notification_rules
  alter column portal_enabled set default true,
  alter column portal_enabled set not null,
  alter column push_enabled set default true,
  alter column push_enabled set not null;

grant select on table public.notification_rules to authenticated;
grant select on table public.notification_controls to authenticated;
grant select,insert,update,delete on table public.notification_preferences to authenticated;
grant update(enabled,portal_enabled,push_enabled,updated_at,updated_by)
on table public.notification_rules to authenticated;

drop policy if exists "notification rules admin update channels" on public.notification_rules;
create policy "notification rules admin update channels"
on public.notification_rules
for update
to authenticated
using ((select private.has_role(array['admin'])))
with check ((select private.has_role(array['admin'])));

drop function if exists public.my_notification_channel_preferences();
create function public.my_notification_channel_preferences()
returns table(
  rule_key text,
  label text,
  description text,
  trigger_text text,
  user_push_enabled boolean,
  user_portal_enabled boolean,
  global_enabled boolean,
  push_allowed boolean,
  global_push_enabled boolean,
  global_portal_enabled boolean,
  effective_push_enabled boolean,
  effective_portal_enabled boolean
)
language sql
security invoker
set search_path=''
as $function$
 select
   r.key,
   r.label,
   r.description,
   r.trigger_text,
   coalesce(p.push_enabled,p.enabled,r.default_user_enabled),
   coalesce(p.portal_enabled,true),
   r.enabled,
   r.push_allowed,
   (r.push_allowed and r.push_enabled),
   r.portal_enabled,
   coalesce(c.enabled,true)
     and r.enabled
     and r.push_allowed
     and r.push_enabled
     and coalesce(p.push_enabled,p.enabled,r.default_user_enabled),
   coalesce(c.enabled,true)
     and r.enabled
     and r.portal_enabled
     and coalesce(p.portal_enabled,true)
 from public.notification_rules r
 left join public.notification_preferences p
   on p.user_id=(select auth.uid()) and p.rule_key=r.key
 left join public.notification_controls c
   on c.user_id=(select auth.uid())
 where (select auth.uid()) is not null
   and r.user_visible=true
 order by r.sort_order,r.label
$function$;

revoke execute on function public.my_notification_channel_preferences() from public,anon;
grant execute on function public.my_notification_channel_preferences() to authenticated;

create or replace function public.my_notification_preferences()
returns table(
  rule_key text,
  label text,
  description text,
  trigger_text text,
  user_enabled boolean,
  global_enabled boolean,
  push_allowed boolean,
  effective_enabled boolean
)
language sql
security invoker
set search_path=''
as $function$
 select
   r.key,r.label,r.description,r.trigger_text,
   coalesce(p.push_enabled,p.enabled,r.default_user_enabled),
   r.enabled,
   r.push_allowed,
   coalesce(c.enabled,true)
     and r.enabled
     and r.push_allowed
     and r.push_enabled
     and coalesce(p.push_enabled,p.enabled,r.default_user_enabled)
 from public.notification_rules r
 left join public.notification_preferences p
   on p.user_id=(select auth.uid()) and p.rule_key=r.key
 left join public.notification_controls c
   on c.user_id=(select auth.uid())
 where (select auth.uid()) is not null
   and r.user_visible=true
 order by r.sort_order,r.label
$function$;

create or replace function public.set_my_notification_preference(
  p_rule_key text,
  p_enabled boolean
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $function$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not exists(select 1 from public.notification_rules where key=p_rule_key) then
    raise exception 'unknown_rule';
  end if;

  insert into public.notification_preferences(
    user_id,rule_key,enabled,push_enabled,portal_enabled,updated_at
  )
  values(auth.uid(),p_rule_key,p_enabled,p_enabled,true,now())
  on conflict(user_id,rule_key) do update
  set enabled=excluded.enabled,
      push_enabled=excluded.push_enabled,
      updated_at=excluded.updated_at;

  return true;
end
$function$;

create or replace function public.set_my_notification_channels(
  p_rule_key text,
  p_push_enabled boolean,
  p_portal_enabled boolean
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $function$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not exists(
    select 1 from public.notification_rules
    where key=p_rule_key and user_visible=true
  ) then raise exception 'unknown_rule'; end if;

  insert into public.notification_preferences(
    user_id,rule_key,enabled,push_enabled,portal_enabled,updated_at
  )
  values(
    auth.uid(),p_rule_key,p_push_enabled,p_push_enabled,p_portal_enabled,now()
  )
  on conflict(user_id,rule_key) do update
  set enabled=excluded.enabled,
      push_enabled=excluded.push_enabled,
      portal_enabled=excluded.portal_enabled,
      updated_at=excluded.updated_at;
  return true;
end
$function$;

revoke execute on function public.set_my_notification_channels(text,boolean,boolean) from public,anon;
grant execute on function public.set_my_notification_channels(text,boolean,boolean) to authenticated;

drop function if exists public.admin_notification_rules();
create function public.admin_notification_rules()
returns table(
  rule_key text,
  label text,
  description text,
  trigger_text text,
  enabled boolean,
  push_allowed boolean,
  portal_enabled boolean,
  push_enabled boolean,
  sort_order integer
)
language sql
security definer
set search_path=''
as $function$
 select
   r.key,r.label,r.description,r.trigger_text,r.enabled,r.push_allowed,
   r.portal_enabled,(r.push_allowed and r.push_enabled),r.sort_order
 from public.notification_rules r
 where exists(
   select 1 from public.profiles p
   where p.id=(select auth.uid()) and p.role='admin'
 )
 order by r.sort_order,r.label
$function$;

revoke execute on function public.admin_notification_rules() from public,anon;
grant execute on function public.admin_notification_rules() to authenticated;

create or replace function public.admin_set_notification_channels(
  p_rule_key text,
  p_portal_enabled boolean,
  p_push_enabled boolean
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $function$
declare
  v_push_allowed boolean;
  v_effective_push boolean;
begin
  select r.push_allowed into v_push_allowed
  from public.notification_rules r
  where r.key=p_rule_key;
  if not found then raise exception 'unknown_rule'; end if;

  v_effective_push:=coalesce(p_push_enabled,false) and coalesce(v_push_allowed,false);

  update public.notification_rules
  set portal_enabled=coalesce(p_portal_enabled,false),
      push_enabled=v_effective_push,
      enabled=(coalesce(p_portal_enabled,false) or v_effective_push),
      updated_at=now(),
      updated_by=auth.uid()
  where key=p_rule_key;

  if not found then raise exception 'forbidden'; end if;
  return true;
end
$function$;

revoke execute on function public.admin_set_notification_channels(text,boolean,boolean) from public,anon;
grant execute on function public.admin_set_notification_channels(text,boolean,boolean) to authenticated;

create or replace function private.filter_planning_notification_portal()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_rule_key text;
  v_global_enabled boolean;
  v_global_portal_enabled boolean;
  v_control_enabled boolean;
  v_portal_enabled boolean;
begin
  v_rule_key:=case
    when new.kind=any(array['manual_edit','import_new','import_replace','reset_day','reset_week']) then 'planning_changes'
    when new.kind='chat_direct' then 'direct_message'
    when new.kind=any(array['chat_group','chat_general','chat_message']) then 'group_message'
    when new.kind=any(array['absence_request','absence_decision']) then 'absence'
    when new.kind='admin_message' then 'admin_message'
    when new.kind='app_update' then 'app_update'
    when new.kind='maintenance' then 'maintenance'
    when new.kind='password_reset_request' then 'security'
    else null
  end;

  if v_rule_key is null then return new; end if;

  select r.enabled,r.portal_enabled
  into v_global_enabled,v_global_portal_enabled
  from public.notification_rules r
  where r.key=v_rule_key;

  if v_global_enabled is false or v_global_portal_enabled is false then return null; end if;

  select c.enabled into v_control_enabled
  from public.notification_controls c
  where c.user_id=new.user_id;
  if v_control_enabled is false then return null; end if;

  select p.portal_enabled into v_portal_enabled
  from public.notification_preferences p
  where p.user_id=new.user_id and p.rule_key=v_rule_key;
  if v_portal_enabled is false then return null; end if;

  return new;
end
$function$;

revoke all on function private.filter_planning_notification_portal() from public;

drop trigger if exists planning_notifications_portal_filter on public.planning_notifications;
create trigger planning_notifications_portal_filter
before insert on public.planning_notifications
for each row execute function private.filter_planning_notification_portal();

-- Mise à jour Nethor : aucun Push système, toujours.
update public.notification_rules
set push_allowed=false,push_enabled=false
where key='app_update';

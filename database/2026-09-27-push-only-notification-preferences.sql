-- Nethor • Préférences utilisateur limitées aux notifications Push
-- 2026-09-27

alter table public.notification_rules
  add column if not exists default_user_enabled boolean not null default true,
  add column if not exists user_visible boolean not null default true;

update public.notification_rules
set
  default_user_enabled=case when key in ('planning_changes','direct_message','group_message') then true else false end,
  user_visible=case when key in ('absence','maintenance','admin_message') then false else true end,
  updated_at=now();

-- Les préférences utilisateur ne coupent plus les notifications internes Nethor.
-- Elles servent uniquement à filtrer les envois Push.
create or replace function private.notification_enabled_for(p_user uuid,p_kind text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 with k as (select private.notification_rule_for_kind(p_kind) as rule_key)
 select
   coalesce((select nc.enabled from public.notification_controls nc where nc.user_id=p_user),true)
   and case
     when (select rule_key from k) is null then true
     else coalesce((select nr.enabled from public.notification_rules nr where nr.key=(select rule_key from k)),true)
   end
$$;

create or replace function public.my_notification_preferences()
returns table(
  rule_key text,label text,description text,trigger_text text,
  user_enabled boolean,global_enabled boolean,push_allowed boolean,effective_enabled boolean
)
language sql
security definer
set search_path=''
as $$
 select r.key,r.label,r.description,r.trigger_text,
        coalesce(p.enabled,r.default_user_enabled),
        r.enabled,
        r.push_allowed,
        coalesce(c.enabled,true)
          and r.enabled
          and r.push_allowed
          and coalesce(p.enabled,r.default_user_enabled)
 from public.notification_rules r
 left join public.notification_preferences p
   on p.user_id=(select auth.uid()) and p.rule_key=r.key
 left join public.notification_controls c
   on c.user_id=(select auth.uid())
 where (select auth.uid()) is not null
   and r.user_visible=true
 order by r.sort_order,r.label
$$;

revoke all on function public.my_notification_preferences() from public,anon;
grant execute on function public.my_notification_preferences() to authenticated;

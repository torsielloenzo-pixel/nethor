-- Nethor • Préférences et règles de notifications
-- 2026-09-27

create table if not exists public.notification_rules (
  key text primary key,
  label text not null,
  description text not null default '',
  trigger_text text not null default '',
  enabled boolean not null default true,
  push_allowed boolean not null default true,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  constraint notification_rules_key_format check (key ~ '^[a-z][a-z0-9_]{1,39}$')
);
alter table public.notification_rules enable row level security;

drop policy if exists "notification rules authenticated read" on public.notification_rules;
create policy "notification rules authenticated read"
on public.notification_rules for select to authenticated using (true);

create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  rule_key text not null references public.notification_rules(key) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, rule_key)
);
alter table public.notification_preferences enable row level security;

drop policy if exists "notification preferences own read" on public.notification_preferences;
create policy "notification preferences own read"
on public.notification_preferences for select to authenticated
using (
  user_id=(select auth.uid())
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

drop policy if exists "notification preferences own insert" on public.notification_preferences;
create policy "notification preferences own insert"
on public.notification_preferences for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists "notification preferences own update" on public.notification_preferences;
create policy "notification preferences own update"
on public.notification_preferences for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

drop policy if exists "notification preferences own delete" on public.notification_preferences;
create policy "notification preferences own delete"
on public.notification_preferences for delete to authenticated
using (user_id=(select auth.uid()));

insert into public.notification_rules(key,label,description,trigger_text,enabled,push_allowed,sort_order)
values
 ('planning_changes','Modifications planning','Changements concernant les horaires et publications du planning.','Quand un planning est modifié, importé, remplacé ou réinitialisé.',true,true,10),
 ('direct_message','Message','Messages privés reçus dans le chat.','À la réception d’un nouveau message privé.',true,true,20),
 ('group_message','Message groupe','Messages reçus dans Général ou dans un groupe.','À la réception d’un message dans une discussion de groupe ou Général.',true,true,30),
 ('absence','Congés & indisponibilités','Demandes et décisions concernant les absences.','Lorsqu’une demande d’absence est créée ou qu’une décision est prise.',true,true,40),
 ('admin_message','Information Nethor','Messages manuels envoyés par un administrateur.','Lorsqu’un administrateur envoie une information depuis l’Éditeur du portail.',true,true,50),
 ('app_update','Mise à jour','Alerte lorsqu’une nouvelle version de Nethor est disponible.','Quand une nouvelle version publiée est détectée par l’application.',true,false,60),
 ('maintenance','Maintenance','Informations liées à l’activation d’une maintenance du portail.','Lorsqu’une maintenance est annoncée par un administrateur.',true,true,70),
 ('security','Sécurité','Alertes importantes concernant le compte, notamment les demandes de mot de passe.','Lorsqu’une action de sécurité nécessite l’attention du compte ou d’un administrateur.',true,true,80)
on conflict (key) do update set
  label=excluded.label,
  description=excluded.description,
  trigger_text=excluded.trigger_text,
  push_allowed=excluded.push_allowed,
  sort_order=excluded.sort_order;

alter table public.planning_notifications drop constraint if exists planning_notifications_kind_check;
alter table public.planning_notifications
add constraint planning_notifications_kind_check
check (kind=any(array[
  'manual_edit'::text,'import_new'::text,'import_replace'::text,'reset_day'::text,'reset_week'::text,
  'password_reset_request'::text,'admin_message'::text,'absence_request'::text,'absence_decision'::text,
  'chat_message'::text,'chat_direct'::text,'chat_group'::text,'chat_general'::text,
  'app_update'::text,'maintenance'::text
]));

create or replace function private.notification_rule_for_kind(p_kind text)
returns text language sql immutable set search_path=''
as $$
 select case
  when p_kind in ('manual_edit','import_new','import_replace','reset_day','reset_week') then 'planning_changes'
  when p_kind='chat_direct' then 'direct_message'
  when p_kind in ('chat_group','chat_general','chat_message') then 'group_message'
  when p_kind in ('absence_request','absence_decision') then 'absence'
  when p_kind='admin_message' then 'admin_message'
  when p_kind='app_update' then 'app_update'
  when p_kind='maintenance' then 'maintenance'
  when p_kind='password_reset_request' then 'security'
  else null
 end
$$;

create or replace function private.notification_enabled_for(p_user uuid,p_kind text)
returns boolean language sql stable security definer set search_path=''
as $$
 with k as (select private.notification_rule_for_kind(p_kind) as rule_key)
 select
   coalesce((select nc.enabled from public.notification_controls nc where nc.user_id=p_user),true)
   and case
     when (select rule_key from k) is null then true
     else coalesce((select nr.enabled from public.notification_rules nr where nr.key=(select rule_key from k)),true)
       and coalesce((select np.enabled from public.notification_preferences np where np.user_id=p_user and np.rule_key=(select rule_key from k)),true)
   end
$$;

create or replace function public.filter_notification_insert()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if not private.notification_enabled_for(new.user_id,new.kind) then return null; end if;
  return new;
end
$$;

drop trigger if exists planning_notification_preferences_filter on public.planning_notifications;
create trigger planning_notification_preferences_filter
before insert on public.planning_notifications
for each row execute function public.filter_notification_insert();

create or replace function public.my_notification_preferences()
returns table(
  rule_key text,label text,description text,trigger_text text,
  user_enabled boolean,global_enabled boolean,push_allowed boolean,effective_enabled boolean
)
language sql security definer set search_path=''
as $$
 select r.key,r.label,r.description,r.trigger_text,
        coalesce(p.enabled,true),r.enabled,r.push_allowed,
        coalesce(c.enabled,true) and r.enabled and coalesce(p.enabled,true)
 from public.notification_rules r
 left join public.notification_preferences p
   on p.user_id=(select auth.uid()) and p.rule_key=r.key
 left join public.notification_controls c
   on c.user_id=(select auth.uid())
 where (select auth.uid()) is not null
 order by r.sort_order,r.label
$$;

create or replace function public.set_my_notification_preference(p_rule_key text,p_enabled boolean)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not exists(select 1 from public.notification_rules where key=p_rule_key) then raise exception 'unknown_rule'; end if;
  insert into public.notification_preferences(user_id,rule_key,enabled,updated_at)
  values(auth.uid(),p_rule_key,p_enabled,now())
  on conflict(user_id,rule_key) do update
  set enabled=excluded.enabled,updated_at=excluded.updated_at;
  return true;
end
$$;

create or replace function public.admin_notification_rules()
returns table(
  rule_key text,label text,description text,trigger_text text,
  enabled boolean,push_allowed boolean,sort_order integer
)
language sql security definer set search_path=''
as $$
 select r.key,r.label,r.description,r.trigger_text,r.enabled,r.push_allowed,r.sort_order
 from public.notification_rules r
 where exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
 order by r.sort_order,r.label
$$;

create or replace function public.admin_set_notification_rule(p_rule_key text,p_enabled boolean)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
    then raise exception 'forbidden';
  end if;
  update public.notification_rules
    set enabled=p_enabled,updated_at=now(),updated_by=auth.uid()
    where key=p_rule_key;
  if not found then raise exception 'unknown_rule'; end if;
  return true;
end
$$;

create or replace function public.notify_chat_message()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  ctype text;cname text;title_text text;preview text;notif_kind text;
begin
  select type,name into ctype,cname from public.chat_conversations where id=new.conversation_id;
  preview:=case when nullif(trim(coalesce(new.body,'')),'') is not null then left(new.body,120) else 'Pièce jointe' end;
  title_text:=case
    when ctype='direct' then 'Nouveau message de '||coalesce(new.display_name,'un membre')
    when ctype='group' then 'Nouveau message • '||coalesce(cname,'Groupe')
    else 'Nouveau message • Général'
  end;
  notif_kind:=case when ctype='direct' then 'chat_direct' when ctype='group' then 'chat_group' else 'chat_general' end;
  insert into public.planning_notifications(user_id,created_by,kind,title,message,target_url)
  select cp.user_id,new.user_id,notif_kind,title_text,preview,'chat.html?c='||new.conversation_id::text
  from public.chat_participants cp
  where cp.conversation_id=new.conversation_id
    and cp.user_id<>new.user_id
    and cp.muted=false
    and private.can_module(cp.user_id,'chat','view')
    and private.notification_enabled_for(cp.user_id,notif_kind);
  return new;
end
$$;

revoke all on function public.my_notification_preferences() from public,anon;
revoke all on function public.set_my_notification_preference(text,boolean) from public,anon;
revoke all on function public.admin_notification_rules() from public,anon;
revoke all on function public.admin_set_notification_rule(text,boolean) from public,anon;
revoke all on function public.filter_notification_insert() from public,anon,authenticated;

grant execute on function public.my_notification_preferences() to authenticated;
grant execute on function public.set_my_notification_preference(text,boolean) to authenticated;
grant execute on function public.admin_notification_rules() to authenticated;
grant execute on function public.admin_set_notification_rule(text,boolean) to authenticated;

create index if not exists notification_preferences_rule_key_idx on public.notification_preferences(rule_key);
create index if not exists notification_rules_updated_by_idx on public.notification_rules(updated_by);

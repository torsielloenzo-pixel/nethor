-- Widget accueil > Tâches du jour
-- Éditeurs : Administrateur / Point de vente
-- Validation : Responsable / Employé
-- Les instances sont datées ; l'interface n'affiche que le jour courant (Europe/Paris).
-- Les tâches ponctuelles vivent uniquement dans daily_tasks et ne sont jamais ajoutées au catalogue.

create table if not exists public.daily_task_catalog (
  key text primary key,
  section_key text not null,
  section_label text not null,
  title text not null,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  task_date date not null,
  catalog_key text references public.daily_task_catalog(key) on delete set null,
  source_keys text[] not null default '{}'::text[],
  title text not null,
  section_key text not null default 'autre',
  section_label text not null default 'Autre',
  detail text,
  all_users boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_task_assignees (
  task_id uuid not null references public.daily_tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(task_id,user_id)
);

create table if not exists public.daily_task_completions (
  task_id uuid not null references public.daily_tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key(task_id,user_id)
);

create index if not exists daily_tasks_catalog_key_idx on public.daily_tasks(catalog_key);
create index if not exists daily_tasks_created_by_idx on public.daily_tasks(created_by);
create index if not exists daily_task_assignees_user_idx on public.daily_task_assignees(user_id,task_id);
create index if not exists daily_task_completions_user_idx on public.daily_task_completions(user_id,task_id);

alter table public.daily_task_catalog enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.daily_task_assignees enable row level security;
alter table public.daily_task_completions enable row level security;

grant select on table public.daily_task_catalog to authenticated;
grant select,insert,update,delete on table public.daily_tasks to authenticated;
grant select,insert,delete on table public.daily_task_assignees to authenticated;
grant select,insert,delete on table public.daily_task_completions to authenticated;

drop policy if exists "daily task catalog authenticated read" on public.daily_task_catalog;
create policy "daily task catalog authenticated read"
on public.daily_task_catalog for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "daily tasks relevant read" on public.daily_tasks;
create policy "daily tasks relevant read"
on public.daily_tasks for select to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
  or (
    exists (
      select 1 from public.profiles me
      where me.id=(select auth.uid())
        and me.role in ('responsable','employe')
    )
    and (
      all_users
      or exists (
        select 1 from public.daily_task_assignees a
        where a.task_id=daily_tasks.id and a.user_id=(select auth.uid())
      )
    )
  )
);

drop policy if exists "daily tasks editor insert" on public.daily_tasks;
create policy "daily tasks editor insert"
on public.daily_tasks for insert to authenticated
with check (
  created_by=(select auth.uid())
  and exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
);

drop policy if exists "daily tasks editor update" on public.daily_tasks;
create policy "daily tasks editor update"
on public.daily_tasks for update to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
)
with check (
  exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
);

drop policy if exists "daily tasks editor delete" on public.daily_tasks;
create policy "daily tasks editor delete"
on public.daily_tasks for delete to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
);

drop policy if exists "daily task assignees relevant read" on public.daily_task_assignees;
create policy "daily task assignees relevant read"
on public.daily_task_assignees for select to authenticated
using (
  user_id=(select auth.uid())
  or exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
);

drop policy if exists "daily task assignees editor insert" on public.daily_task_assignees;
create policy "daily task assignees editor insert"
on public.daily_task_assignees for insert to authenticated
with check (
  exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
  and exists (
    select 1 from public.profiles target
    where target.id=user_id and target.role in ('responsable','employe')
  )
);

drop policy if exists "daily task assignees editor delete" on public.daily_task_assignees;
create policy "daily task assignees editor delete"
on public.daily_task_assignees for delete to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
);

drop policy if exists "daily task completions relevant read" on public.daily_task_completions;
create policy "daily task completions relevant read"
on public.daily_task_completions for select to authenticated
using (
  user_id=(select auth.uid())
  or exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('admin','role_point-de-vente','point_vente','surface_vente')
  )
);

drop policy if exists "daily task completions own insert" on public.daily_task_completions;
create policy "daily task completions own insert"
on public.daily_task_completions for insert to authenticated
with check (
  user_id=(select auth.uid())
  and exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('responsable','employe')
  )
  and exists (
    select 1 from public.daily_tasks t
    where t.id=task_id
      and t.task_date=(timezone('Europe/Paris',now()))::date
      and (
        t.all_users
        or exists (
          select 1 from public.daily_task_assignees a
          where a.task_id=t.id and a.user_id=(select auth.uid())
        )
      )
  )
);

drop policy if exists "daily task completions own delete" on public.daily_task_completions;
create policy "daily task completions own delete"
on public.daily_task_completions for delete to authenticated
using (
  user_id=(select auth.uid())
  and exists (
    select 1 from public.profiles me
    where me.id=(select auth.uid())
      and me.role in ('responsable','employe')
  )
);

insert into public.daily_task_catalog(key,section_key,section_label,title,sort_order,active) values
 ('repasse_fl','fl','Fruits & légumes','Repasse fruits & légumes',10,true),
 ('livraison_sec','livraison_stock','Livraison & stock','Livraison sec',20,true),
 ('stock_sec','livraison_stock','Livraison & stock','Stock sec',21,true),
 ('livraison_gel','livraison_stock','Livraison & stock','Livraison gel',22,true),
 ('stock_gel','livraison_stock','Livraison & stock','Stock gel',23,true),
 ('stock_frais','livraison_stock','Livraison & stock','Stock frais',24,true),
 ('enlever_balise_promo','promotion','Promotion','Enlever balise promotion',30,true),
 ('balisage_promo','promotion','Promotion','Balisage promotion',31,true),
 ('enlever_ancienne_promo','promotion','Promotion','Enlever ancienne promotion',32,true),
 ('placer_nouvelle_promo','promotion','Promotion','Placer nouvelle promotion',33,true),
 ('nettoyage_rotissoire','nettoyage','Nettoyage','Rôtissoire',40,true),
 ('nettoyage_four','nettoyage','Nettoyage','Four',41,true),
 ('nettoyage_bords_rayons','nettoyage','Nettoyage','Bords des rayons',42,true),
 ('nettoyage_salle_pause','nettoyage','Nettoyage','Salle de pause',43,true),
 ('nettoyage_chambres_froides','nettoyage','Nettoyage','Chambres froides',44,true),
 ('nettoyage_bureau','nettoyage','Nettoyage','Bureau',45,true),
 ('facing_sec','facing','Facing','Sec',50,true),
 ('facing_gel','facing','Facing','Gel',51,true),
 ('facing_frais','facing','Facing','Frais',52,true),
 ('dates_frais','dates','Dates','Dates frais',60,true)
on conflict(key) do update set
 section_key=excluded.section_key,
 section_label=excluded.section_label,
 title=excluded.title,
 sort_order=excluded.sort_order,
 active=excluded.active;

update public.app_settings
set value =
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(value,'{home_widgets,tasks,roles,admin}','true'::jsonb,true),
          '{home_widgets,tasks,roles,role_point-de-vente}','true'::jsonb,true
        ),
        '{home_widgets,tasks,roles,responsable}','true'::jsonb,true
      ),
      '{home_widgets,tasks,roles,employe}','true'::jsonb,true
    ),
    '{home_widgets,tasks,roles,lecture}','false'::jsonb,true
  ),
  updated_at=now()
where key='site_config';

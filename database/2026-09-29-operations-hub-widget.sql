-- Nethor — Widget Pilotage magasin
-- Relève et Mon service réutilisent les données existantes (daily_tasks + planning).
-- Ces tables couvrent uniquement les nouvelles données structurées : commandes, livraisons et Flash.

create table if not exists public.operations_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_phone text,
  pickup_label text,
  pickup_at timestamptz,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items)='array'),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','deposit')),
  status text not null default 'pending' check (status in ('pending','preparing','ready','collected','cancelled')),
  location text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists operations_orders_status_pickup_idx on public.operations_orders(status,pickup_at,created_at desc);

create table if not exists public.operations_deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_date date not null default current_date,
  stream text not null default 'other' check (stream in ('sec','frais','surg','fl','other')),
  supplier text,
  expected_label text,
  expected_at timestamptz,
  supports integer check (supports is null or supports>=0),
  position_label text,
  status text not null default 'planned' check (status in ('planned','en_route','arrived','received','put_away','cancelled')),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists operations_deliveries_day_status_idx on public.operations_deliveries(delivery_date,status,expected_at);

create table if not exists public.operations_flashes (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'info' check (category in ('procedure','price','material','product','info')),
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 1200),
  target_ean13 text check (target_ean13 is null or target_ean13 ~ '^[0-9]{13}$'),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists operations_flashes_active_expiry_idx on public.operations_flashes(active,expires_at,created_at desc);

alter table public.operations_orders enable row level security;
alter table public.operations_deliveries enable row level security;
alter table public.operations_flashes enable row level security;

create or replace function private.operations_widget_visible()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
  select 1 from public.profiles p
  where p.id=(select auth.uid())
    and (
      p.role='admin'
      or coalesce((select (s.value #>> array['home_widgets','operations_hub','roles',p.role])::boolean from public.app_settings s where s.key='site_config'),false)
      or exists(
        select 1 from public.user_subroles us
        join public.app_settings s on s.key='site_config'
        where us.user_id=(select auth.uid())
          and coalesce((s.value #>> array['home_widgets','operations_hub','subroles',us.subrole_key])::boolean,false)
      )
    )
 )
$$;

create or replace function private.operations_widget_manage()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
$$;

revoke all on function private.operations_widget_visible() from public,anon;
revoke all on function private.operations_widget_manage() from public,anon;
grant execute on function private.operations_widget_visible() to authenticated;
grant execute on function private.operations_widget_manage() to authenticated;

grant select,insert,update,delete on public.operations_orders to authenticated;
grant select,insert,update,delete on public.operations_deliveries to authenticated;
grant select,insert,update,delete on public.operations_flashes to authenticated;

drop policy if exists "operations orders widget read" on public.operations_orders;
create policy "operations orders widget read" on public.operations_orders for select to authenticated using ((select private.operations_widget_visible()));
drop policy if exists "operations orders admin insert" on public.operations_orders;
create policy "operations orders admin insert" on public.operations_orders for insert to authenticated with check ((select private.operations_widget_manage()));
drop policy if exists "operations orders admin update" on public.operations_orders;
create policy "operations orders admin update" on public.operations_orders for update to authenticated using ((select private.operations_widget_manage())) with check ((select private.operations_widget_manage()));
drop policy if exists "operations orders admin delete" on public.operations_orders;
create policy "operations orders admin delete" on public.operations_orders for delete to authenticated using ((select private.operations_widget_manage()));

drop policy if exists "operations deliveries widget read" on public.operations_deliveries;
create policy "operations deliveries widget read" on public.operations_deliveries for select to authenticated using ((select private.operations_widget_visible()));
drop policy if exists "operations deliveries admin insert" on public.operations_deliveries;
create policy "operations deliveries admin insert" on public.operations_deliveries for insert to authenticated with check ((select private.operations_widget_manage()));
drop policy if exists "operations deliveries admin update" on public.operations_deliveries;
create policy "operations deliveries admin update" on public.operations_deliveries for update to authenticated using ((select private.operations_widget_manage())) with check ((select private.operations_widget_manage()));
drop policy if exists "operations deliveries admin delete" on public.operations_deliveries;
create policy "operations deliveries admin delete" on public.operations_deliveries for delete to authenticated using ((select private.operations_widget_manage()));

drop policy if exists "operations flashes widget read" on public.operations_flashes;
create policy "operations flashes widget read" on public.operations_flashes for select to authenticated using ((select private.operations_widget_visible()));
drop policy if exists "operations flashes admin insert" on public.operations_flashes;
create policy "operations flashes admin insert" on public.operations_flashes for insert to authenticated with check ((select private.operations_widget_manage()));
drop policy if exists "operations flashes admin update" on public.operations_flashes;
create policy "operations flashes admin update" on public.operations_flashes for update to authenticated using ((select private.operations_widget_manage())) with check ((select private.operations_widget_manage()));
drop policy if exists "operations flashes admin delete" on public.operations_flashes;
create policy "operations flashes admin delete" on public.operations_flashes for delete to authenticated using ((select private.operations_widget_manage()));

update public.app_settings
set value=jsonb_set(
 value,'{home_widgets,operations_hub}',
 jsonb_build_object(
  'enabled',true,
  'label','Pilotage magasin',
  'subtitle','Relève, service, commandes, livraisons et Flash magasin',
  'density','compact',
  'max_items',3,
  'show_counters',true,
  'default_section','handover',
  'sections',jsonb_build_object('handover',true,'service',true,'orders',true,'deliveries',true,'flashes',true),
  'roles',jsonb_build_object('admin',true,'role_point-de-vente',false,'responsable',false,'employe',false,'lecture',false),
  'subroles',coalesce(value #> '{home_widgets,operations_hub,subroles}','{}'::jsonb)
 ),true
),updated_at=now()
where key='site_config';

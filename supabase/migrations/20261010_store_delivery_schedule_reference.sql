-- Nethor · Planning récurrent des livraisons.
-- Migration déjà exécutée sur le projet Supabase Nethor le 2026-10-10.
-- À distinguer de operations_deliveries, qui suit les réceptions ponctuelles.
-- Les jours ISO vont de 1 (lundi) à 7 (dimanche).
-- Les heures sont interprétées comme heure locale Europe/Paris.
create table if not exists public.store_delivery_schedule (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 label text not null,
 category text not null check (category in ('frais','gel','sec')),
 weekdays smallint[] not null default '{}'::smallint[],
 certainty text not null default 'habituel' check (certainty in ('habituel','possible')),
 period text not null default 'non_precise' check (period in ('nuit','journee','non_precise')),
 window_start time without time zone,
 window_end time without time zone,
 note text,
 active boolean not null default true,
 sort_order integer not null default 100,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint delivery_reference_weekdays check (
  array_length(weekdays,1) between 1 and 7 and
  weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
 ),
 constraint delivery_reference_hours check (
  (window_start is null and window_end is null)
  or (window_start is not null and window_end is not null and window_start < window_end)
 )
);
create index if not exists store_delivery_schedule_active_sort_idx
 on public.store_delivery_schedule(active,sort_order);
alter table public.store_delivery_schedule enable row level security;
revoke all on table public.store_delivery_schedule from anon;
grant select,insert,update,delete on public.store_delivery_schedule to authenticated;

drop policy if exists "store_delivery_schedule_read_active_session" on public.store_delivery_schedule;
create policy "store_delivery_schedule_read_active_session"
 on public.store_delivery_schedule for select to authenticated
 using ((select private.session_is_active()));

drop policy if exists "store_delivery_schedule_admin_insert" on public.store_delivery_schedule;
create policy "store_delivery_schedule_admin_insert"
 on public.store_delivery_schedule for insert to authenticated
 with check ((select private.session_is_active()) and (select private.has_role(array['admin'::text])));

drop policy if exists "store_delivery_schedule_admin_update" on public.store_delivery_schedule;
create policy "store_delivery_schedule_admin_update"
 on public.store_delivery_schedule for update to authenticated
 using ((select private.session_is_active()) and (select private.has_role(array['admin'::text])))
 with check ((select private.session_is_active()) and (select private.has_role(array['admin'::text])));

drop policy if exists "store_delivery_schedule_admin_delete" on public.store_delivery_schedule;
create policy "store_delivery_schedule_admin_delete"
 on public.store_delivery_schedule for delete to authenticated
 using ((select private.session_is_active()) and (select private.has_role(array['admin'::text])));

-- Données initiales demandées. Les insertions suivantes sont libres : de nouvelles
-- familles/lignes pourront être ajoutées sans éditer le moteur du widget.
insert into public.store_delivery_schedule
(code,label,category,weekdays,certainty,period,window_start,window_end,note,active,sort_order)
values
('frais_traiteur_ppi','Traiteur & PPI','frais',array[2,4,6]::smallint[],'habituel','nuit',null,null,'Livraison dans la nuit. Non incluse dans le compteur de livraisons attendues.',true,10),
('frais_cremerie','Crémerie','frais',array[1,3,5]::smallint[],'habituel','nuit',null,null,'Livraison dans la nuit. Non incluse dans le compteur de livraisons attendues.',true,20),
('frais_fruits_legumes','Fruits & Légumes','frais',array[1,2,3,4,5,6]::smallint[],'habituel','nuit',null,null,'Livraison dans la nuit. Non incluse dans le compteur de livraisons attendues.',true,30),
('gel_habituel','Gel','gel',array[2,5]::smallint[],'habituel','non_precise',null,null,'Jour habituel. Créneau horaire non communiqué.',true,40),
('gel_mercredi_possible','Gel','gel',array[3]::smallint[],'possible','non_precise',null,null,'Arrivage du mercredi occasionnel, à confirmer. Non compté comme assuré.',true,50),
('sec_habituel','Sec','sec',array[2,4,5]::smallint[],'habituel','journee','12:00'::time,'20:30'::time,'Fenêtre habituelle entre 12 h et 20 h 30.',true,60)
on conflict (code) do nothing;

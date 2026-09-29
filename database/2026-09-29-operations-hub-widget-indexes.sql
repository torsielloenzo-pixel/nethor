-- Index complémentaires du widget Pilotage magasin.
-- Évite les clés étrangères created_by non indexées signalées par l’advisor Supabase.
create index if not exists operations_orders_created_by_idx
  on public.operations_orders(created_by);
create index if not exists operations_deliveries_created_by_idx
  on public.operations_deliveries(created_by);
create index if not exists operations_flashes_created_by_idx
  on public.operations_flashes(created_by);

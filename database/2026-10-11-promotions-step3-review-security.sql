-- Nethor Promotions — Étape 3 : contrôle humain avant exposition aux employés.
-- À exécuter seulement sur la base Supabase Nethor.
-- RLS : toutes les références sont accessibles aux administrateurs/points de vente actifs,
-- mais les autres comptes actifs ne peuvent lire que les fiches validées ou retravaillées.
drop policy if exists "promo products active read" on public.promotion_products;
create policy "promo products active read" on public.promotion_products
for select to authenticated
using (
 (select private.session_is_active())
 and exists (
   select 1 from public.profiles u
   where u.id=(select auth.uid())
     and u.account_enabled is distinct from false
     and (
       u.role in ('admin','role_point-de-vente')
       or promotion_products.review_status in ('validated','reworked')
     )
 )
);

-- Empêcher les statuts "contrôlé" si le prix n'a pas été détecté.
-- Vérification au niveau base, y compris si la RPC était appelée sans l'interface.
create or replace function private.promotion_review_required_fields()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.review_status in ('validated','reworked')
    and (tg_op='INSERT'
         or new.review_status is distinct from old.review_status
         or new.price_or_benefit is distinct from old.price_or_benefit)
    and (btrim(coalesce(new.price_or_benefit,''))=''
         or lower(btrim(new.price_or_benefit)) in ('prix non détecté','prix non detecte'))
 then
   raise exception 'Prix promotionnel non détecté : corrige le produit avant de le valider.';
 end if;
 return new;
end $$;
drop trigger if exists promotion_review_required_fields on public.promotion_products;
create trigger promotion_review_required_fields
before insert or update on public.promotion_products
for each row execute function private.promotion_review_required_fields();
revoke all on function private.promotion_review_required_fields()
 from public,anon,authenticated;

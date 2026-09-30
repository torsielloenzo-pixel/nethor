-- Nethor • Scanner mobile relié au référentiel des fiches articles
-- 2026-09-30
--
-- Le Scanner est accessible à plusieurs rôles alors que la page Fiches articles
-- peut rester réservée à l'administration. La recherche Scanner passe donc par
-- une RPC SECURITY DEFINER limitée aux champs utiles, sans élargir la lecture
-- directe de toute la table products.

create or replace function private.can_page_access(target_user uuid, target_page text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cfg jsonb;
  page_cfg jsonb;
  main_role text;
  explicit_perm text;
  sub_perm text;
begin
  if target_user is null or coalesce(target_page,'')='' then
    return false;
  end if;

  select p.role into main_role
  from public.profiles p
  where p.id=target_user;

  if main_role is null then
    return false;
  end if;

  select a.value into cfg
  from public.app_settings a
  where a.key='site_config'
  limit 1;

  page_cfg := cfg #> array['pages',target_page];

  if page_cfg is null or jsonb_typeof(page_cfg) <> 'object' then
    return false;
  end if;

  if coalesce((page_cfg->>'enabled')::boolean,true)=false then
    return false;
  end if;

  explicit_perm := cfg #>> array['role_permissions',target_page,main_role];

  if explicit_perm is not null then
    if explicit_perm in ('view','operate','manage') then
      return true;
    end if;

    if explicit_perm='none' then
      select case
        when bool_or(sp.permission in ('view','operate','manage')) then 'view'
        else 'none'
      end
      into sub_perm
      from public.user_subroles us
      join public.subrole_module_permissions sp on sp.subrole_key=us.subrole_key
      where us.user_id=target_user and sp.module=target_page;

      return coalesce(sub_perm,'none')<>'none';
    end if;
  end if;

  if exists(
    select 1
    from public.user_subroles us
    join public.subrole_module_permissions sp on sp.subrole_key=us.subrole_key
    where us.user_id=target_user
      and sp.module=target_page
      and sp.permission in ('view','operate','manage')
  ) then
    return true;
  end if;

  if jsonb_typeof(page_cfg->'roles')='array' then
    return (page_cfg->'roles') ? main_role;
  end if;

  return false;
end;
$$;

revoke all on function private.can_page_access(uuid,text) from public, anon;
grant execute on function private.can_page_access(uuid,text) to authenticated;

create or replace function public.scan_products_by_ean(lookup_eans text[])
returns table(
  id uuid,
  name text,
  ean text,
  article_code text,
  photo_url text,
  on_sale boolean,
  active boolean,
  packaging_count integer,
  shelf_capacity integer,
  family_name text,
  family_slug text,
  category_name text,
  packaging_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.can_page_access(auth.uid(),'scanner') then
    raise exception 'Accès Scanner requis';
  end if;

  return query
  select
    p.id,
    p.name,
    p.ean,
    p.article_code,
    p.photo_url,
    p.on_sale,
    p.active,
    p.packaging_count,
    p.shelf_capacity,
    f.name,
    f.slug,
    c.name,
    pk.name
  from public.products p
  left join public.product_families f on f.id=p.family_id
  left join public.product_categories c on c.id=p.category_id
  left join public.product_packagings pk on pk.id=p.packaging_id
  where p.active=true
    and p.ean = any(coalesce(lookup_eans,array[]::text[]))
  order by array_position(lookup_eans,p.ean)
  limit greatest(2,coalesce(array_length(lookup_eans,1),0));
end;
$$;

revoke all on function public.scan_products_by_ean(text[]) from public, anon;
grant execute on function public.scan_products_by_ean(text[]) to authenticated;

-- Les politiques de lecture directes restent limitées aux modules métier.
drop policy if exists "products module read" on public.products;
create policy "products module read"
on public.products
for select
to authenticated
using (
  (select private.can_module((select auth.uid()), 'articles', 'view'))
  or (
    (select private.can_module((select auth.uid()), 'stock', 'view'))
    and family_id = (
      select product_families.id
      from public.product_families
      where product_families.slug='fruits-legumes'
      limit 1
    )
  )
  or (
    (select private.can_module((select auth.uid()), 'bakery', 'view'))
    and family_id = (
      select product_families.id
      from public.product_families
      where product_families.slug='boulangerie'
      limit 1
    )
  )
);

drop policy if exists "product families module read" on public.product_families;
create policy "product families module read"
on public.product_families
for select
to authenticated
using (
  (select private.can_module((select auth.uid()), 'articles', 'view'))
  or ((select private.can_module((select auth.uid()), 'stock', 'view')) and slug='fruits-legumes')
  or ((select private.can_module((select auth.uid()), 'bakery', 'view')) and slug='boulangerie')
);

drop policy if exists "product categories module read" on public.product_categories;
create policy "product categories module read"
on public.product_categories
for select
to authenticated
using (
  (select private.can_module((select auth.uid()), 'articles', 'view'))
  or (
    (select private.can_module((select auth.uid()), 'stock', 'view'))
    and family_id = (
      select product_families.id
      from public.product_families
      where product_families.slug='fruits-legumes'
      limit 1
    )
  )
  or (
    (select private.can_module((select auth.uid()), 'bakery', 'view'))
    and family_id = (
      select product_families.id
      from public.product_families
      where product_families.slug='boulangerie'
      limit 1
    )
  )
);

drop policy if exists "product packagings module read" on public.product_packagings;
create policy "product packagings module read"
on public.product_packagings
for select
to authenticated
using (
  (select private.can_module((select auth.uid()), 'articles', 'view'))
  or (select private.can_module((select auth.uid()), 'stock', 'view'))
  or (select private.can_module((select auth.uid()), 'bakery', 'view'))
);

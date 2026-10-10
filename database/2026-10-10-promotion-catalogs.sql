-- Nethor · Base de données des catalogues et références promotionnelles
-- Catalogue PDF privé, références consultables par les comptes actifs.
-- Import réservé à Administrateur et Point de vente ; transaction atomique côté serveur.
create table if not exists public.promotion_catalogs (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 2 and 240),
 source_filename text not null check (char_length(source_filename) between 4 and 255),
 storage_path text not null unique,
 valid_from date not null,
 valid_until date not null,
 pages_total integer not null check (pages_total between 1 and 150),
 unclassified_count integer not null default 0 check (unclassified_count between 0 and 50000),
 reviewed_pages jsonb not null default '[]'::jsonb,
 imported_by uuid not null references public.profiles(id),
 imported_at timestamptz not null default now(),
 constraint promotion_catalogs_dates check (valid_until>=valid_from),
 constraint promotion_catalogs_reviewed_array check (jsonb_typeof(reviewed_pages)='array')
);
create table if not exists public.promotion_products (
 id uuid primary key default gen_random_uuid(),
 catalog_id uuid not null references public.promotion_catalogs(id) on delete cascade,
 position integer not null check (position between 1 and 2000),
 product_name text not null check (char_length(trim(product_name)) between 2 and 500),
 technical_details text not null default '' check (char_length(technical_details)<=1200),
 price_or_benefit text not null check (char_length(trim(price_or_benefit)) between 1 and 1200),
 source_page integer not null check (source_page between 1 and 150),
 source_excerpt text not null default '' check (char_length(source_excerpt)<=1500),
 extraction_confidence text not null default 'review' check (extraction_confidence in ('high','review','manual')),
 created_at timestamptz not null default now(),
 unique(catalog_id,position)
);
create index if not exists promotion_catalogs_dates_idx on public.promotion_catalogs(valid_from desc,valid_until desc);
create index if not exists promotion_products_catalog_idx on public.promotion_products(catalog_id,position);

alter table public.promotion_catalogs enable row level security;
alter table public.promotion_products enable row level security;
revoke all on public.promotion_catalogs, public.promotion_products from public,anon,authenticated;
grant select on public.promotion_catalogs,public.promotion_products to authenticated;

drop policy if exists "promo catalogs active read" on public.promotion_catalogs;
create policy "promo catalogs active read" on public.promotion_catalogs
for select to authenticated using (
 private.session_is_active() and exists (
 select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_enabled is distinct from false
 ));
drop policy if exists "promo products active read" on public.promotion_products;
create policy "promo products active read" on public.promotion_products
for select to authenticated using (
 private.session_is_active() and exists (
 select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_enabled is distinct from false
 ));
-- Aucune politique INSERT/UPDATE/DELETE sur les tables : seule la fonction validée insère.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('promotion-pdfs','promotion-pdfs',false,31457280,array['application/pdf']::text[])
on conflict(id) do update set public=false,file_size_limit=31457280,allowed_mime_types=array['application/pdf']::text[];

drop policy if exists "promotion pdf upload managers" on storage.objects;
create policy "promotion pdf upload managers" on storage.objects
for insert to authenticated with check (
 bucket_id='promotion-pdfs'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and private.session_is_active()
 and exists(select 1 from public.profiles p where p.id=(select auth.uid())
   and p.account_enabled is distinct from false and p.role in ('admin','role_point-de-vente'))
);
drop policy if exists "promotion pdf read managers" on storage.objects;
create policy "promotion pdf read managers" on storage.objects
for select to authenticated using (
 bucket_id='promotion-pdfs' and private.session_is_active()
 and exists(select 1 from public.profiles p where p.id=(select auth.uid())
   and p.account_enabled is distinct from false and p.role in ('admin','role_point-de-vente'))
);

create or replace function public.import_promotion_catalog(
 p_title text,
 p_filename text,
 p_storage_path text,
 p_valid_from date,
 p_valid_until date,
 p_pages integer,
 p_unclassified integer,
 p_reviewed_pages jsonb,
 p_products jsonb
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid := auth.uid();
 v_catalog uuid;
 v_count integer;
 v_item jsonb;
 v_position integer:=0;
 v_page integer;
begin
 if v_user is null or not private.session_is_active() or not exists (
  select 1 from public.profiles p where p.id=v_user
  and p.account_enabled is distinct from false and p.role in ('admin','role_point-de-vente')
 ) then
  raise exception 'Accès refusé' using errcode='42501';
 end if;
 if p_pages not between 1 and 150 or p_valid_from is null or p_valid_until is null
    or p_valid_until<p_valid_from or p_unclassified is null or p_unclassified<0
    or char_length(trim(coalesce(p_title,''))) not between 2 and 240
    or char_length(trim(coalesce(p_filename,''))) not between 4 and 255
    or p_filename !~* '\.pdf$'
    or p_storage_path not like v_user::text || '/%'
    or p_storage_path !~* '\.pdf$' then
  raise exception 'Métadonnées du catalogue non valides';
 end if;
 if jsonb_typeof(p_products) is distinct from 'array'
    or jsonb_typeof(p_reviewed_pages) is distinct from 'array' then
  raise exception 'Liste de références/pages invalide';
 end if;
 v_count:=jsonb_array_length(p_products);
 if v_count<1 or v_count>2000 then raise exception 'Nombre de références invalide'; end if;
 if jsonb_array_length(p_reviewed_pages)<>p_pages
    or exists(select 1 from jsonb_array_elements_text(p_reviewed_pages) x
              where x.value !~ '^[0-9]+$' or x.value::int not between 1 and p_pages)
    or (select count(distinct x.value) from jsonb_array_elements_text(p_reviewed_pages) x)<>p_pages then
  raise exception 'Toutes les pages du PDF doivent être vérifiées';
 end if;
 -- Le fichier d'origine doit vraiment exister dans l'espace privé correspondant.
 if not exists(select 1 from storage.objects o where o.bucket_id='promotion-pdfs'
               and o.name=p_storage_path and o.owner_id=v_user::text) then
  raise exception 'PDF original introuvable ou non autorisé';
 end if;
 insert into public.promotion_catalogs(
 title,source_filename,storage_path,valid_from,valid_until,
 pages_total,unclassified_count,reviewed_pages,imported_by)
 values(trim(p_title),trim(p_filename),p_storage_path,p_valid_from,p_valid_until,
 p_pages,p_unclassified,p_reviewed_pages,v_user)
 returning id into v_catalog;

 for v_item in select value from jsonb_array_elements(p_products) loop
  v_position:=v_position+1;
  v_page:=case when coalesce(v_item->>'source_page','') ~ '^[0-9]+$'
               then (v_item->>'source_page')::int else 0 end;
  if v_page not between 1 and p_pages
   or char_length(trim(coalesce(v_item->>'product_name',''))) not between 2 and 500
   or char_length(trim(coalesce(v_item->>'price_or_benefit',''))) not between 1 and 1200
   or char_length(coalesce(v_item->>'technical_details',''))>1200
   or char_length(coalesce(v_item->>'source_excerpt',''))>1500
   or coalesce(v_item->>'extraction_confidence','review') not in ('high','review','manual') then
   raise exception 'Référence n° % non valide',v_position;
  end if;
  insert into public.promotion_products(
   catalog_id,position,product_name,technical_details,price_or_benefit,
   source_page,source_excerpt,extraction_confidence)
  values(v_catalog,v_position,trim(v_item->>'product_name'),
   coalesce(v_item->>'technical_details',''),trim(v_item->>'price_or_benefit'),
   v_page,coalesce(v_item->>'source_excerpt',''),
   coalesce(v_item->>'extraction_confidence','review'));
 end loop;
 return v_catalog;
end;
$$;
revoke all on function public.import_promotion_catalog(
 text,text,text,date,date,integer,integer,jsonb,jsonb) from public,anon;
grant execute on function public.import_promotion_catalog(
 text,text,text,date,date,integer,integer,jsonb,jsonb) to authenticated;

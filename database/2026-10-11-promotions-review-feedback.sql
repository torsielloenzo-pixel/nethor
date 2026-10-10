-- Promotions : revue produit, apprentissage déterministe et suppression catalogue.
-- Les observations subsistent après suppression du catalogue pour aider les imports suivants.
alter table public.promotion_products
 add column if not exists review_status text not null default 'pending',
 add column if not exists reviewed_by uuid references public.profiles(id),
 add column if not exists reviewed_at timestamptz;
alter table public.promotion_products drop constraint if exists promotion_products_review_status_check;
alter table public.promotion_products add constraint promotion_products_review_status_check
 check (review_status in ('pending','validated','reworked','rejected'));

create table if not exists public.promotion_analysis_feedback (
 id bigint generated always as identity primary key,
 source_product_name text not null check (char_length(source_product_name) between 2 and 500),
 source_excerpt text not null default '' check (char_length(source_excerpt)<=1500),
 source_key text not null check (char_length(source_key) between 2 and 500),
 source_catalog_id uuid not null,
 source_product_id uuid not null,
 action text not null check (action in ('validated','reworked','rejected')),
 corrected_name text not null default '',
 corrected_category text not null default '',
 original_details jsonb not null default '{}'::jsonb,
 corrected_details jsonb not null default '{}'::jsonb,
 reviewed_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create index if not exists promo_feedback_rules_idx on public.promotion_analysis_feedback(source_key,created_at desc,id desc);
alter table public.promotion_analysis_feedback enable row level security;
revoke all on public.promotion_analysis_feedback from public,anon,authenticated;
grant select on public.promotion_analysis_feedback to authenticated;
drop policy if exists "promotion feedback managers read" on public.promotion_analysis_feedback;
create policy "promotion feedback managers read" on public.promotion_analysis_feedback
for select to authenticated using (
 private.session_is_active() and exists (
  select 1 from public.profiles p where p.id=(select auth.uid())
   and p.account_enabled is distinct from false and p.role in ('admin','role_point-de-vente')
 )
);
-- Supabase Storage delete is checked against the original bucket and active role.
drop policy if exists "promotion pdf delete managers" on storage.objects;
create policy "promotion pdf delete managers" on storage.objects
for delete to authenticated using (
 bucket_id='promotion-pdfs' and private.session_is_active()
 and exists (
  select 1 from public.profiles p where p.id=(select auth.uid())
  and p.account_enabled is distinct from false and p.role in ('admin','role_point-de-vente')
 )
);
create or replace function public.review_promotion_product(
 p_product_id uuid,p_action text,p_fields jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_product public.promotion_products%rowtype;
 v_name text;
 v_category text;
 v_technical text;
 v_price text;
 v_unit text;
 v_extra text;
 v_source_key text;
begin
 if v_actor is null or not private.session_is_active()
   or not exists(select 1 from public.profiles p where p.id=v_actor
    and p.account_enabled is distinct from false and p.role in ('admin','role_point-de-vente'))
 then raise exception 'Accès Promotions refusé' using errcode='42501'; end if;
 if p_action not in ('validated','reworked','rejected')
    or p_fields is null or jsonb_typeof(p_fields)<>'object'
 then raise exception 'Action de revue non valide'; end if;
 select * into v_product from public.promotion_products where id=p_product_id for update;
 if not found then raise exception 'Référence introuvable'; end if;
 v_name:=case when p_action='reworked'
  then trim(coalesce(p_fields->>'product_name',''))
  else v_product.product_name end;
 v_category:=case when p_action='reworked'
  then trim(coalesce(p_fields->>'category',''))
  else v_product.category end;
 v_technical:=case when p_action='reworked'
  then trim(coalesce(p_fields->>'technical_details',''))
  else v_product.technical_details end;
 v_price:=case when p_action='reworked'
  then trim(coalesce(p_fields->>'price_or_benefit',''))
  else v_product.price_or_benefit end;
 v_unit:=case when p_action='reworked'
  then trim(coalesce(p_fields->>'price_unit',''))
  else v_product.price_unit end;
 v_extra:=case when p_action='reworked'
  then trim(coalesce(p_fields->>'additional_info',''))
  else v_product.additional_info end;
 if char_length(v_name) not between 2 and 500 or char_length(v_category) not between 1 and 60
   or char_length(v_technical)>1200 or char_length(v_price) not between 1 and 1200
   or char_length(v_unit)>120 or char_length(v_extra)>1200
 then raise exception 'Champs produit invalides ou trop longs'; end if;
 v_source_key:=lower(regexp_replace(trim(v_product.product_name),'\s+',' ','g'));
 -- Les modifications successives partant d'un produit déjà retravaillé sont
 -- historisées ; seul le texte source réellement disponible est appris.
 insert into public.promotion_analysis_feedback (
  source_product_name,source_excerpt,source_key,source_catalog_id,source_product_id,
  action,corrected_name,corrected_category,original_details,corrected_details,reviewed_by
 ) values (
  v_product.product_name,v_product.source_excerpt,v_source_key,
  v_product.catalog_id,v_product.id,p_action,
  case when p_action='rejected' then '' else v_name end,
  case when p_action='rejected' then '' else v_category end,
  jsonb_build_object('name',v_product.product_name,'category',v_product.category,
   'technical_details',v_product.technical_details,'price_or_benefit',v_product.price_or_benefit,
   'price_unit',v_product.price_unit,'additional_info',v_product.additional_info),
  case when p_action='rejected' then '{}'::jsonb else jsonb_build_object(
   'name',v_name,'category',v_category,'technical_details',v_technical,
   'price_or_benefit',v_price,'price_unit',v_unit,'additional_info',v_extra) end,
  v_actor
 );
 update public.promotion_products set
  review_status=p_action,
  reviewed_by=v_actor,reviewed_at=now(),
  auto_uncertain=case when p_action='rejected' then true else false end,
  product_name=v_name,category=v_category,technical_details=v_technical,
  price_or_benefit=v_price,price_unit=v_unit,additional_info=v_extra,
  extraction_confidence=case when p_action='validated' then 'high'
    when p_action='reworked' then 'manual' else extraction_confidence end
 where id=v_product.id;
 update public.promotion_catalogs c set unclassified_count=(
  select count(*) from public.promotion_products p
  where p.catalog_id=c.id and p.review_status='pending' and p.auto_uncertain
 ) where c.id=v_product.catalog_id;
 return jsonb_build_object('id',v_product.id,'catalog_id',v_product.catalog_id,
  'review_status',p_action,'source_key',v_source_key);
end;
$$;
revoke all on function public.review_promotion_product(uuid,text,jsonb) from public,anon;
grant execute on function public.review_promotion_product(uuid,text,jsonb) to authenticated;

-- Deleted catalogues do not delete their historical feedback rules.
-- The PDF is removed from the private bucket by the authorised client
-- immediately after this transactional database operation.
create or replace function public.delete_promotion_catalog(p_catalog_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_storage text;
 v_title text;
 v_products integer;
begin
 if v_actor is null or not private.session_is_active()
   or not exists(select 1 from public.profiles p where p.id=v_actor
    and p.account_enabled is distinct from false and p.role in ('admin','role_point-de-vente'))
 then raise exception 'Accès Promotions refusé' using errcode='42501'; end if;
 select c.storage_path,c.title into v_storage,v_title from public.promotion_catalogs c
 where c.id=p_catalog_id for update;
 if not found then raise exception 'Catalogue introuvable'; end if;
 select count(*) into v_products from public.promotion_products p where p.catalog_id=p_catalog_id;
 delete from public.promotion_catalogs where id=p_catalog_id;
 return jsonb_build_object('deleted',true,'title',v_title,'storage_path',v_storage,'products',v_products);
end;
$$;
revoke all on function public.delete_promotion_catalog(uuid) from public,anon;
grant execute on function public.delete_promotion_catalog(uuid) to authenticated;

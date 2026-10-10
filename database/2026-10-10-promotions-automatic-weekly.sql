-- Nethor Promotions V2 : import autonome, période réelle et clé de semaine ISO.
-- La semaine de rattachement suit le premier jour de validité, même si le catalogue
-- débute mardi et se termine le lundi de la semaine suivante.
alter table public.promotion_catalogs
 add column if not exists week_start date,
 add column if not exists week_end date,
 add column if not exists iso_year integer,
 add column if not exists iso_week integer,
 add column if not exists file_sha256 text,
 add column if not exists extraction_state text not null default 'legacy_reviewed',
 add column if not exists extraction_diagnostics jsonb not null default '{}'::jsonb;
alter table public.promotion_products
 add column if not exists category text not null default 'À classer',
 add column if not exists auto_uncertain boolean not null default false;

update public.promotion_catalogs
 set week_start=valid_from-(extract(isodow from valid_from)::integer-1),
     week_end=valid_from-(extract(isodow from valid_from)::integer-1)+6,
     iso_year=extract(isoyear from valid_from)::integer,
     iso_week=extract(week from valid_from)::integer
 where week_start is null;
create index if not exists promotion_catalogs_iso_week_idx
 on public.promotion_catalogs(iso_year,iso_week,week_start);
create index if not exists promotion_products_category_idx
 on public.promotion_products(catalog_id,category);
create unique index if not exists promotion_catalogs_sha_idx
 on public.promotion_catalogs(file_sha256) where file_sha256 is not null;

-- Sans validation manuelle : transaction atomique et contrôles serveur.
-- Pour un scan sans texte ou des dates absentes, le navigateur ne doit
-- jamais inventer des dates ni prétendre avoir identifié tous les produits.
create or replace function public.import_promotion_catalog_auto(
 p_filename text,
 p_storage_path text,
 p_file_sha256 text,
 p_valid_from date,
 p_valid_until date,
 p_pages integer,
 p_products jsonb,
 p_diagnostics jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid := auth.uid();
 v_id uuid;
 v_title text;
 v_monday date;
 v_iso_year integer;
 v_iso_week integer;
 v_row jsonb;
 v_i integer:=0;
 v_page integer;
 v_category text;
 v_uncertain boolean;
 v_uncertain_total integer:=0;
 v_count integer;
 v_state text;
begin
 if v_user is null or not private.session_is_active() or not exists(
   select 1 from public.profiles p
   where p.id=v_user and p.account_enabled is distinct from false
     and p.role in ('admin','role_point-de-vente')
 ) then raise exception 'Accès Promotions refusé' using errcode='42501'; end if;

 if p_valid_from is null or p_valid_until is null or p_valid_until<p_valid_from
    or p_valid_until > p_valid_from+100
    or p_pages not between 1 and 150
    or char_length(coalesce(p_filename,'')) not between 4 and 255
    or p_filename !~* '\.pdf$'
    or p_storage_path not like v_user::text||'/%'
    or p_storage_path !~* '\.pdf$'
    or p_file_sha256 is null or p_file_sha256 !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_products) is distinct from 'array'
    or jsonb_typeof(p_diagnostics) is distinct from 'object'
 then raise exception 'PDF, dates ou résultats d''analyse non valides'; end if;

 v_count:=jsonb_array_length(p_products);
 if v_count not between 1 and 2000 then
   raise exception 'Aucune référence exploitable ou trop de références dans le catalogue'; end if;
 if exists(select 1 from public.promotion_catalogs c where c.file_sha256=p_file_sha256) then
   raise exception 'Ce PDF Promotions a déjà été importé'; end if;

 if not exists(select 1 from storage.objects o
  where o.bucket_id='promotion-pdfs' and o.name=p_storage_path
    and o.owner_id=v_user::text) then
   raise exception 'Le PDF original privé est introuvable'; end if;

 v_monday:=p_valid_from-(extract(isodow from p_valid_from)::integer-1);
 v_iso_year:=extract(isoyear from p_valid_from)::integer;
 v_iso_week:=extract(week from p_valid_from)::integer;
 v_title:='Promotions Netto - Semaine '||lpad(v_iso_week::text,2,'0');

 v_state:=case when coalesce((p_diagnostics->>'textless_pages')::integer,0)>0
   then 'partial' when coalesce((p_diagnostics->>'uncertain_count')::integer,0)>0
   then 'automatic_uncertain' else 'automatic' end;

 insert into public.promotion_catalogs(
  title,source_filename,storage_path,valid_from,valid_until,
  pages_total,unclassified_count,reviewed_pages,imported_by,
  week_start,week_end,iso_year,iso_week,file_sha256,
  extraction_state,extraction_diagnostics
 )values(
  v_title,p_filename,p_storage_path,p_valid_from,p_valid_until,
  p_pages,0,'[]'::jsonb,v_user,
  v_monday,v_monday+6,v_iso_year,v_iso_week,p_file_sha256,
  v_state,p_diagnostics
 )returning id into v_id;

 for v_row in select value from jsonb_array_elements(p_products) loop
  v_i:=v_i+1;
  v_page:=case when coalesce(v_row->>'source_page','') ~ '^[0-9]{1,3}$'
    then (v_row->>'source_page')::integer else 0 end;
  v_category:=coalesce(nullif(trim(v_row->>'category'),''),'À classer');
  v_uncertain:=coalesce((v_row->>'auto_uncertain')::boolean,true);
  if v_page not between 1 and p_pages
    or char_length(trim(coalesce(v_row->>'product_name',''))) not between 2 and 500
    or char_length(trim(coalesce(v_row->>'price_or_benefit',''))) not between 1 and 1200
    or char_length(coalesce(v_row->>'technical_details',''))>1200
    or char_length(coalesce(v_row->>'source_excerpt',''))>1500
    or char_length(v_category)>60
    or coalesce(v_row->>'extraction_confidence','review') not in ('high','review','manual')
  then raise exception 'Référence % invalide',v_i; end if;
  insert into public.promotion_products(
   catalog_id,position,product_name,technical_details,price_or_benefit,
   source_page,source_excerpt,extraction_confidence,category,auto_uncertain
  )values(
   v_id,v_i,trim(v_row->>'product_name'),coalesce(v_row->>'technical_details',''),
   trim(v_row->>'price_or_benefit'),v_page,coalesce(v_row->>'source_excerpt',''),
   coalesce(v_row->>'extraction_confidence','review'),v_category,v_uncertain
  );
  if v_uncertain then v_uncertain_total:=v_uncertain_total+1; end if;
 end loop;
 update public.promotion_catalogs set unclassified_count=v_uncertain_total where id=v_id;
 return jsonb_build_object('id',v_id,'title',v_title,'week_start',v_monday,
   'week_end',v_monday+6,'iso_week',v_iso_week,'iso_year',v_iso_year,
   'products',v_count,'uncertain',v_uncertain_total,'extraction_state',v_state);
end;
$$;
revoke all on function public.import_promotion_catalog_auto(
 text,text,text,date,date,integer,jsonb,jsonb) from public,anon;
grant execute on function public.import_promotion_catalog_auto(
 text,text,text,date,date,integer,jsonb,jsonb) to authenticated;

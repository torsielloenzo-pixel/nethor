-- Nethor • Scanner robuste + moteur d'hypothèses conservateur
-- 2026-09-30
--
-- Objectif :
-- 1. conserver la recherche exacte comme source prioritaire ;
-- 2. en cas de lecture imparfaite, ne proposer QUE des fiches existantes ;
-- 3. calculer un score de concordance à partir des chiffres observés ;
-- 4. ne jamais valider automatiquement une hypothèse.

create or replace function private.ean_edit_distance(a text,b text)
returns integer
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  la integer := length(a);
  lb integer := length(b);
  i integer;
  j integer;
  cost integer;
  prev integer[];
  curr integer[];
begin
  if a=b then return 0; end if;
  if la=0 then return lb; end if;
  if lb=0 then return la; end if;

  prev := array(select generate_series(0,lb));

  for i in 1..la loop
    curr := array_fill(0,array[lb+1]);
    curr[1] := i;

    for j in 1..lb loop
      cost := case when substr(a,i,1)=substr(b,j,1) then 0 else 1 end;
      curr[j+1] := least(
        curr[j] + 1,
        prev[j+1] + 1,
        prev[j] + cost
      );
    end loop;

    prev := curr;
  end loop;

  return prev[lb+1];
end;
$$;

revoke all on function private.ean_edit_distance(text,text)
from public,anon,authenticated;

create or replace function public.scan_product_hypotheses(
  observed text,
  max_results integer default 3
)
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
  packaging_name text,
  confidence numeric,
  match_reason text,
  edit_distance integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  obs text := regexp_replace(coalesce(observed,''),'\D','','g');
  lim integer := greatest(1,least(coalesce(max_results,3),5));
begin
  if auth.uid() is null
     or not private.can_page_access(auth.uid(),'scanner') then
    raise exception 'Accès Scanner requis';
  end if;

  -- Sous 6 chiffres, trop peu d'information pour proposer une fiche proprement.
  if length(obs)<6 or length(obs)>14 then
    return;
  end if;

  return query
  with candidates as (
    select
      p.*,
      regexp_replace(coalesce(p.ean,''),'\D','','g') cean,
      private.ean_edit_distance(
        obs,
        regexp_replace(coalesce(p.ean,''),'\D','','g')
      ) dist
    from public.products p
    where p.active=true
      and p.ean is not null
  ),
  ranked as (
    select
      c.*,
      case
        when c.cean=obs then 1.000
        when length(c.cean)=length(obs) and c.dist=1 then 0.970
        when abs(length(c.cean)-length(obs))=1 and c.dist=1 then 0.950
        when length(c.cean)=length(obs) and c.dist=2 then 0.860
        when length(obs)>=10 and position(obs in c.cean)>0
          then least(0.940,0.860+(length(obs)-9)*0.020)
        when length(obs)>=8 and position(obs in c.cean)>0
          then 0.850+(length(obs)-8)*0.015
        when length(obs)>=7
          and (
            left(c.cean,length(obs))=obs
            or right(c.cean,length(obs))=obs
          )
          then 0.800+(length(obs)-7)*0.018
        else 0.000
      end::numeric as score,
      case
        when c.cean=obs then 'EAN exact'
        when length(c.cean)=length(obs) and c.dist=1
          then '1 chiffre différent'
        when abs(length(c.cean)-length(obs))=1 and c.dist=1
          then '1 chiffre manquant ou supplémentaire'
        when length(c.cean)=length(obs) and c.dist=2
          then '2 chiffres différents'
        when length(obs)>=8 and position(obs in c.cean)>0
          then 'Séquence partielle concordante ('||length(obs)||' chiffres)'
        when length(obs)>=7 and left(c.cean,length(obs))=obs
          then 'Début du code concordant ('||length(obs)||' chiffres)'
        when length(obs)>=7 and right(c.cean,length(obs))=obs
          then 'Fin du code concordante ('||length(obs)||' chiffres)'
        else null
      end as reason
    from candidates c
  )
  select
    r.id,
    r.name,
    r.ean,
    r.article_code,
    r.photo_url,
    r.on_sale,
    r.active,
    r.packaging_count,
    r.shelf_capacity,
    f.name,
    f.slug,
    pc.name,
    pk.name,
    r.score,
    r.reason,
    r.dist
  from ranked r
  left join public.product_families f on f.id=r.family_id
  left join public.product_categories pc on pc.id=r.category_id
  left join public.product_packagings pk on pk.id=r.packaging_id
  where r.score>=0.80
  order by r.score desc,r.dist asc,r.name
  limit lim;
end;
$$;

revoke all on function public.scan_product_hypotheses(text,integer)
from public,anon;

grant execute on function public.scan_product_hypotheses(text,integer)
to authenticated;

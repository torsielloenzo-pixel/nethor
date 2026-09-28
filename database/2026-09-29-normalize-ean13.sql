-- Normalisation des références produit vers EAN13.
-- Les valeurs de 1 à 12 chiffres sont complétées par des zéros à gauche.
-- Les valeurs de plus de 13 chiffres ne sont jamais tronquées automatiquement afin d'éviter toute perte de donnée.

update public.products
set ean = lpad(regexp_replace(trim(ean), '\\D', '', 'g'), 13, '0')
where nullif(trim(ean), '') is not null
  and length(regexp_replace(trim(ean), '\\D', '', 'g')) between 1 and 12;

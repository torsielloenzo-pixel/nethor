# Nethor · Livraisons récurrentes (Desktop → Accueil)

## Base de données

Table Supabase : `public.store_delivery_schedule`.

Cette table recense les **habitudes de passage** du magasin, indépendamment de `operations_deliveries`, qui correspond aux réceptions réellement saisies. Le compteur « Livraisons attendues » représente des **flux/catégories prévus**, pas un nombre certifié de camions ni l'état de réception.

Les six règles de départ ont été enregistrées directement sur la base et versionnées dans `supabase/migrations/20261010_store_delivery_schedule_reference.sql`.

| Code | Flux | Jours ISO (lundi=1, dimanche=7) | Fiabilité | Période | Horaires |
| --- | --- | --- | --- | --- | --- |
| frais_traiteur_ppi | Traiteur & PPI | 2, 4, 6 | habituel | nuit | non précisés |
| frais_cremerie | Crémerie | 1, 3, 5 | habituel | nuit | non précisés |
| frais_fruits_legumes | Fruits & Légumes | 1, 2, 3, 4, 5, 6 | habituel | nuit | non précisés |
| gel_habituel | Gel | 2, 5 | habituel | non précisée | non précisés |
| gel_mercredi_possible | Gel | 3 | possible | non précisée | non précisés |
| sec_habituel | Sec | 2, 4, 5 | habituel | journée | 12:00 – 20:30 |

## Calcul du compteur

Pour la date du magasin (fuseau Europe/Paris), compter les règles actives qui correspondent au jour et remplissent **simultanément** :
- `certainty = 'habituel'` : le mercredi gel « possible » est présenté à part, pas compté comme certain ;
- `period != 'nuit'` : exclut toutes les livraisons de frais nocturnes.

Récapitulatif hebdomadaire normal : lundi **0**, mardi **2**, mercredi **0 + 1 possible**, jeudi **1**, vendredi **2**, samedi **0**, dimanche **0**. Soit **5** flux habituels à comptabiliser, **1** optionnel, et **12** flux de nuit informatifs.

Le nombre reste une **prévision de fréquence par famille**. Aucun fournisseur, horaire de gel, volume, réception confirmée ou nombre de camions n'est inventé. La période « sec entre 12:00 et 20:30 » est un **créneau habituel**, pas un engagement de livraison.

## Fenêtre du widget

L'accueil desktop contient une fenêtre analogue à « Détection d'anomalies » avec :
- une vue **Par jour** pour chaque journée du lundi au dimanche, répartie en « Habituel de jour », « Possible » et « De nuit (hors compteur) » ;
- une vue **Semaine complète** regroupant les sept jours ;
- une nouvelle lecture Supabase à chaque ouverture, pour consulter les dernières modifications.

Les styles de la fenêtre sont dans `runtime/home-delivery-dialog.css`, son comportement dans `runtime/home-delivery-dialog.js` et les calculs partagés dans `runtime/delivery-schedule.js`.

Si la lecture Supabase est indisponible, la fenêtre indique clairement « mode secours » et se réfère uniquement aux six règles initiales connues. Si la base retourne volontairement **zéro** ligne, elle reste vide et le fallback ne recrée pas les anciennes règles.

## Évolutions futures

Ajouter une nouvelle règle **sans modifier le JavaScript** : un administrateur pourra insérer une ligne avec un `code` unique, un `label`, une `category` (`frais`, `gel` ou `sec`), un tableau `weekdays`, `certainty`, `period` et, si elles sont connues, `window_start` / `window_end`. Mettre `active=false` pour la désactiver sans supprimer l'historique de la définition.

La table est protégée par la **Row Level Security** : lecture uniquement avec session authentifiée active, gestion réservée aux administrateurs. Il reste à créer un éditeur métier dans Gestion lors de l'ajout de nouvelles familles ou horaires.

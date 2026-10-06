# Nethor — Phase 3 : protection contre les écritures concurrentes

**6 octobre 2026 — v1.46.27 (PWA 376)**

## Constat

La version précédente affichait la révision officielle `planning_weeks.updated_at`, mais un enregistrement direct `upsert` ne contrôlait pas si le planning avait changé depuis le chargement. Deux responsables pouvaient donc écraser mutuellement leur semaine.

## Changement principal

Les fonctions SQL `public.planning_save_week_if_revision` et `public.planning_delete_week_if_revision` imposent une comparaison atomique avec la révision chargée par l'utilisateur.

- Si la semaine n'existe pas, une création n'est acceptée que si la version attendue est `null`; l'insertion utilise `ON CONFLICT DO NOTHING`.
- Si la semaine existe, `UPDATE ... WHERE week_start = ... AND updated_at = p_expected_revision` garantit qu'un brouillon ancien ne remplace pas un planning plus récent, y compris en présence de transactions concurrentes.
- La suppression d'une semaine nécessite elle aussi sa révision exacte.
- Une révision refusée renvoie `status = conflict` et ne modifie aucune donnée.
- Les fonctions exigent explicitement une session authentifiée active et la permission `planning/manage`.
- Les droits directs `INSERT/UPDATE/DELETE` sont retirés au rôle client `authenticated` pour `planning_weeks`. Cette mesure **empêche les anciennes versions de Nethor de contourner le verrouillage** : elles devront se mettre à jour avant de pouvoir modifier le planning.

Les opérations restent atomiques au sein d'une même transaction Postgres. Les déclencheurs existants d'audit, de révision et de lecture du planning sont conservés.

## Interface

- **Modifications manuelles :** en cas de conflit, avertissement et conservation du brouillon ; aucune notification de réussite n'est émise.
- **Imports Excel :** relecture de la révision avant de remplacer une semaine ; un import refusé ne devient jamais le planning actif par erreur.
- **Archives :** si une écriture a pu être acceptée mais que la réponse réseau a échoué, le fichier Excel n'est pas supprimé. Une vérification manuelle pourra être nécessaire.
- **Réinitialisation de semaine :** suppression refusée si une autre modification a été publiée depuis la consultation.
- **Requêtes lentes :** une réponse réseau démarrée avant la saisie ne remplace pas les modifications en cours.
- **Indisponibilités / congés :** une décision de validation/refus ne remplace plus silencieusement une décision déjà enregistrée ; contrôle sur `status=pending` et `updated_at`.
- **Accusés Lu :** un brouillon non publié n'est pas marqué comme une consultation de la version active.

## Tests sans toucher aux horaires réels

- **17 contrôles statiques :** partage des ressources PWA, absence d'écriture directe depuis le Planning, intégration des deux RPC, contrôle serveur et publication de version.
- **5 scénarios applicatifs simulés :** deux responsables enregistrant le même planning, deux imports simultanés, refus des droits, erreur réseau après écriture acceptée, absence de réponse réseau fiable.
- **1 test spécifique :** une réponse serveur retardée ne remplace pas un brouillon déjà modifié.

## Limites et suites

Ces simulations et vérifications statiques **ne remplacent pas** un test concurrent en conditions réelles avec deux comptes autorisés. En particulier, une épreuve de charge et un test mobile/desktop iPhone doivent valider la latence, les écrans de conflit et les notifications.

Les autres ressources modifiables (tâches, paramètres, fiches articles, etc.) n'ont pas encore reçu ce contrôle de version atomique et devront être traitées selon leur degré de risque.

**Déploiement :** appliquer d'abord la version 376 au dépôt, puis la migration Supabase. Une session conservant une ancienne version de l'interface ne pourra plus écrire directement ; une actualisation de l'application est nécessaire.

## Durcissement de l'exposition API

Les implémentations `SECURITY DEFINER` sont déplacées dans le schéma non exposé `private`. Les fonctions `public.planning_save_week_if_revision` et `public.planning_delete_week_if_revision` conservent leur API et leurs paramètres, mais deviennent des façades `SECURITY INVOKER`. Les vérifications de session et de permission restent dans les fonctions privées ; les accès anonymes ne sont pas accordés. Aucun changement côté interface n'est nécessaire.

## Vérification complémentaire — privilèges clients et double enregistrement

**Correctif v1.46.28 — PWA 377, 6 octobre 2026.**

L'audit de fin de phase 3 a découvert des privilèges SQL administratifs restants sur les tables publiques malgré les protections RLS :

- `anon` avait le droit `TRUNCATE` sur 35 tables publiques ;
- `authenticated` disposait de `TRUNCATE` sur 39 tables publiques, parmi 53 tables examinées.

La commande `TRUNCATE` n'est pas soumise aux règles RLS de filtrage des lignes. La migration `database/2026-10-06-revoke-client-destructive-table-privileges.sql` révoque donc `TRUNCATE`, `TRIGGER` et `REFERENCES` des rôles clients sur les tables publiques. Elle conserve les permissions métier `SELECT`, `INSERT`, `UPDATE` et `DELETE` et leurs contrôles RLS. Le rôle serveur `service_role` n'est pas modifié.

Le Planning empêche aussi le double envoi simultané d'un même enregistrement, d'une modification ou d'une réinitialisation. Le changement de semaine est bloqué pendant la publication afin que la confirmation d'une opération ne se rapporte jamais à une autre semaine.

**Vérifications sans toucher aux horaires réels :** 11 contrôles de cohérence du code et du cache, 6 scénarios de publication simulés (succès, conflit, droits refusés, coupure réseau, double soumission, changement de semaine). Après application de la migration, vérifier les privilèges effectifs depuis Supabase.

**Limites :** ni les simulations ni les requêtes d'audit ne remplacent un véritable essai simultané avec deux comptes de responsables. Les droits des rôles serveurs et des schémas hors `public` ne relèvent pas de ce correctif.

# Nethor — Audit de fiabilité, phase 1

Date : 6 octobre 2026  
Périmètre : Planning (desktop et mobile), Accueil mobile, statut « Lu / Non lu », cache, publication Supabase.

## Résultats confirmés

| Contrôle | Résultat | Élément vérifié |
| --- | --- | --- |
| Révision autoritaire | Conforme dans la configuration | `private.planning_weeks_server_version` est installé et activé sur `public.planning_weeks` |
| Contrôle d'accès | Conforme sur le planning | RLS active ; garde de session `RESTRICTIVE` ; `anon` ne peut pas sélectionner `planning_weeks` |
| Lecture liée à la version | Conforme dans la fonction SQL | `planning_mark_day_read_impl(date,text,timestamptz)` compare la révision présentée à la révision active sous verrou de lecture |
| Lecture historique | Vérification partielle de données existantes | 23/24 reçus valides pour le 05/10 et 21/21 pour le 12/10 ; l'ancien reçu non lié à une version reste exclu |
| Cache Supabase | Conforme dans le Service Worker | Les requêtes vers un autre domaine, notamment Supabase, ne sont pas traitées par le cache du Service Worker |
| Revalidation mobile | Présente dans le code | Chargement après montage, retour au premier plan, reconnexion ; comparaison des semaines préchargées |

Les nombres de reçus sont un instantané d'audit, pas une garantie permanente.

## Défauts identifiés et corrigés

### A — Abonnements Realtime non opérationnels

Avant le correctif, `supabase_realtime` ne publiait ni `public.planning_weeks` ni `public.planning_absences`, malgré les abonnements `postgres_changes` déjà installés dans les interfaces.  
**Correction :** migration idempotente `database/2026-10-06-planning-realtime-subscriptions.sql`. Aucune politique RLS n'est relâchée.

### B — Échec de vérification confondu avec échec d'enregistrement

Une écriture `upsert` pouvait réussir puis la relecture réseau échouer. La fonction `saveWeek()` renvoyait alors `false`, ce qui déclenchait la suppression du fichier Excel archivé tandis que la ligne en base pouvait déjà y faire référence.  
**Correction :** une écriture acceptée ne déclenche plus la suppression du fichier si la relecture échoue ; l'interface présente un état *version non confirmée*. Les imports non revérifiés sont signalés sans annoncer « version vérifiée ».

### C — Confirmations trompeuses après un échec d'écriture

`saveAndFinishEdit()` et `resetDay()` ne vérifiaient pas le retour de `saveWeek()`, puis poursuivaient les notifications et les messages de succès.  
**Correction :** chaque opération interrompt sa suite en cas d'échec de l'écriture. Le statut de confirmation reste distinct de l'acceptation par l'API.

## Risques à traiter dans les phases suivantes

- **Phase 2 :** cartographier tous les abonnements Realtime (Chat, notifications, tâches, profils, etc.) ; les publications hors planning ne sont pas garanties par ce correctif.
- **Phase 3 :** remplacer l'`upsert` concurrent « dernier écrivain gagnant » par un enregistrement conditionnel / version optimiste côté serveur.
- **Phase 4 :** expliciter les données hors connexion et définir une règle unique pour les transitions « à jour », « à vérifier », « impossible à vérifier ».
- **Phase 5 :** exécuter des tests bout en bout avec deux sessions authentifiées et un vrai iPhone, une perte de connexion et des imports concurrents.

## Tests non destructifs de la phase 1

- Vérification du code chargé depuis le dépôt GitHub, de la syntaxe JS et du versionnement des ressources PWA.
- 13 contrôles statiques de cohérence passés (ressources, cache, accusés de lecture, import, publication Realtime).
- 5 scénarios simulés de `saveWeek()` validés : refus d'écriture, écriture confirmée, lecture serveur en échec, lecture serveur interrompue, remplacement concurrent immédiatement après publication. Ces scénarios utilisent des doublures et n'écrivent aucune donnée en base.
- Vérification SQL des politiques RLS, des déclencheurs, de la publication `supabase_realtime`, et des fonctions de lecture.
- Comparaison des révisions et des reçus par agrégats, sans lire de données personnelles ni modifier les plannings.
- **Limite :** les notifications Realtime en temps réel ne sont pas testées de bout en bout avec une session d'employé.

Ce document ne prétend pas certifier l'ensemble des fonctions Nethor : il clôt uniquement les vérifications de fondations demandées pour le planning.

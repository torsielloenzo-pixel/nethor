# Nethor — Phase 2 : coordination de la synchronisation mobile

**Date :** 6 octobre 2026

## Objectif

Supprimer les abonnements Realtime concurrents entre Accueil, Planning et Chat dans le shell mobile, sans modifier les structures du planning ni les politiques de contrôle d'accès.

## Architecture

Le script `ui/mobile/mobile-sync.js`, chargé **avant** MobileServices, gère :
- **Un canal Postgres Changes** partagé et limité à la session mobile courante.
- Les changements de `planning_weeks`, `planning_absences`, `daily_tasks`, `daily_task_assignees`, `daily_task_completions`, `profiles`, `chat_conversations`, `chat_messages`, `chat_participants` et `chat_reactions`.
- Des invalidations par domaine (`planning`, `absences`, `tasks`, `team`, `chat`, `notifications`), regroupées sur 100 ms.
- Le retour en ligne, au premier plan, depuis la navigation et après une reprise de canal.
- Un rattrapage périodique en premier plan, sans interroger le serveur en continu lorsque l'application est cachée ou hors ligne.
- La fermeture du canal à la déconnexion et au changement d'utilisateur.

La publication `supabase_realtime` reçoit les trois tables de tâches et quatre tables de permissions et de préférences déjà écoutées dans MobileServices. Toutes les tables ajoutées avaient RLS activée, sans droit SELECT anonyme.

## Intégrations

| Partie | Comportement |
| --- | --- |
| Accueil mobile | Un seul abonnement au coordinateur pour planning, absences, tâches et équipe ; annule les préchargements quand les données deviennent invalides |
| Planning mobile | Abonnement commun aux événements de planning, d'absence et de reprise ; garde sa comparaison de version serveur et sa protection contre les réponses tardives |
| Chat mobile | Abonnement au canal central pour données et membres ; les canaux de présence et de saisie restent distincts car ils gèrent des événements éphémères |
| Notifications | Le canal existant de MobileServices reste unique ; l'ensemble est revérifié en reprise via `MobileServices.refresh()` |
| Permissions | MobileServices reçoit enfin les événements depuis les tables publiées ; les contrôles serveur ne changent pas |
| Desktop | Les abonnements existants restent intacts, non concernés par le shell mobile |

## Garanties supplémentaires

- `refreshCore`, `refreshPermissions` et `refreshNotifications` ne doivent pas appliquer une réponse d'un ancien utilisateur ou une réponse devenue obsolète.
- Le rafraîchissement complet de MobileServices est coalescé pour éviter les requêtes parallèles inutiles.
- Un rafraîchissement raté ne vide pas la liste des notifications ni les préférences précédemment reçues.
- Les changements de lecture des conversations n'entraînent plus de boucle de confirmations de lecture.

## Tests sans impact sur les données du magasin

Un environnement simulé a validé :
1. Un seul canal central après deux démarrages avec la même session.
2. Dix tables couvertes et aiguillage des événements vers le bon module.
3. Regroupement des événements Chat multiples.
4. Aucune confirmation réseau en mode hors connexion.
5. Rattrapage unique au retour en ligne.
6. Actualisation des notifications au rattrapage.
7. Synchronisation déclenchée à l'ouverture du Chat.
8. Isolation après changement d'utilisateur.
9. Nettoyage des canaux et des écouteurs.

Ces simulations ne remplacent **pas** un essai multi-appareils avec comptes authentifiés et réseau instable.

## Suite

- **Phase 3 :** protection des écritures concurrentes par contrôle de version atomique (et prévention du dernier écrivain gagnant).
- **Phase 4 :** état visible des données hors connexion et gestion des expirations.
- **Phase 5 :** tests end-to-end sur plusieurs navigateurs, iPhone réel, et instrumentation des erreurs.

**Important :** ce chantier centralise le **mobile**. Les interfaces desktop devront être intégrées au mécanisme de même niveau lors d'un chantier dédié, après validation des comportements mobiles.

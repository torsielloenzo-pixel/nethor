# Audit backend de préproduction — 12 octobre 2026

Audit en lecture seule du projet Supabase Nethor (`gioxrpaiwogqqtakjpnv`).

## État général
- Projet : actif et sain.
- Région : `eu-west-1`.
- PostgreSQL : 17.6.1.
- Toutes les tables du schéma `public` recensées par l'audit ont RLS activée.
- Aucun changement de données, rôle, politique ou fonction n'a été appliqué pendant cet audit.

## Comptes et rôles réels

| Rôle | Comptes actifs | Comptes désactivés |
|---|---:|---:|
| Administrateur | 1 | 0 |
| Point de vente | 1 | 0 |
| Responsable | 2 | 0 |
| Employé | 10 | 1 |
| Lecture seule | 0 | 0 |

Les cinq rôles sont bien enregistrés dans `app_roles`.

Sous-rôles présents :
- Référent FL : 2 affectations ;
- Jeux : 1 affectation.

À la date de l'audit, `subrole_module_permissions` ne contient aucune permission de module supplémentaire.

## Permissions configurées dans site_config

### Planning
- Administrateur : `manage`
- Point de vente : `manage`
- Responsable : `view`
- Employé : `view`
- Lecture seule : `view`

### Gestion
- Administrateur : `manage`
- Point de vente : `none`
- Responsable : `none`
- Employé : `none`
- Lecture seule : `none`

### Gestion des comptes
- Administrateur : `manage`
- tous les autres rôles : `none`

### Fiches articles
- Administrateur : `manage`
- tous les autres rôles : `none`

### Chat
- Administrateur : `manage`
- Point de vente / Responsable / Employé / Lecture seule : `view`

### Profil
- Administrateur : `manage`
- Point de vente / Responsable / Employé / Lecture seule : `view`

## Modules ajoutés par la refonte

### Équipe
`team` n'est pas encore enregistré dans le `site_config` de production. La branche fournit donc sa définition par défaut.

Le RPC public `list_team_members()` :
- n'est exécutable que par `authenticated` ;
- délègue à une fonction privée ;
- ne donne pas d'accès anonyme.

La fonction privée renvoie aussi l'état `account_enabled`. La nouvelle page `team.html` filtre explicitement les comptes désactivés avant affichage.

### Promotions
`promotions` n'est pas encore enregistré dans `site_config`.

Le contrôle réel se fait déjà côté serveur :
- tout compte authentifié actif peut lire les catalogues ;
- Admin et Point de vente peuvent gérer/importer/revoir ;
- les autres rôles ne lisent dans `promotion_products` que les références `validated` ou `reworked` ;
- les fonctions de mutation contrôlent la session active et limitent les rôles à Admin/Point de vente.

## Planning : source de vérité

Semaine du 5 octobre 2026 :
- fichier publié : `PLANNING 05.10.26 SEMAINE B.xls`
- historique d'import le plus récent : même fichier ;
- correspondance : OK ;
- 14 personnes dans le modèle publié.

Semaine du 12 octobre 2026 :
- fichier publié : `PLANNING 12.10.26 SEMAINE C.xls`
- historique d'import le plus récent : même fichier ;
- correspondance : OK ;
- 14 personnes dans le modèle publié.

Cela confirme que la table `planning_weeks` pointe actuellement vers le dernier import enregistré pour ces deux semaines.

## Protection des écritures Planning

Les RPC publics :
- `planning_save_week_if_revision`
- `planning_delete_week_if_revision`

sont accessibles uniquement aux utilisateurs authentifiés et délèguent à des fonctions privées.

Les fonctions privées vérifient avant toute écriture :
1. `auth.uid()` présent ;
2. session active ;
3. `private.can_module(user,'planning','manage')` ;
4. révision attendue pour empêcher d'écraser une modification concurrente.

Point de vente et Administrateur sont donc les seuls rôles actuellement configurés avec `manage` sur Planning.

## Observation importante sur private.can_module

`private.can_module()` impose :
- que le `target_user` soit exactement `auth.uid()` ;
- une session active ;
- le niveau de permission demandé.

Une requête d'audit exécutée hors session utilisateur ne peut donc pas simuler artificiellement les droits d'un autre compte. Ce comportement est souhaitable.

## Advisories Supabase à suivre séparément

L'audit Supabase signale :
- 3 tables avec RLS activée et aucune policy, dont deux tables `private` de Planning et `public.promotion_vision_usage` ;
- plusieurs fonctions `SECURITY DEFINER` exécutables par `authenticated` ;
- `get_public_login_config()` exécutable par `anon`.

Ces alertes ne prouvent pas à elles seules une vulnérabilité : plusieurs RPC Nethor effectuent leurs propres contrôles de session/rôle et les tables privées peuvent volontairement ne pas avoir de policies accessibles. Elles doivent néanmoins faire l'objet d'un audit sécurité dédié avant toute modification.

Aucune correction automatique n'est appliquée pendant la refonte UI.

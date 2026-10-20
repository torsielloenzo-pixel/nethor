# Nethor 2.0 — Phase A · Architecture & base de données

État de départ contrôlé le **3 octobre 2026** sur le projet Supabase `stock-fl`.

## Objectif

Faire de PostgreSQL/Supabase la source de vérité de Nethor, avec une architecture vérifiable, versionnée et restaurable, sans casser les fonctions actuelles Desktop/Mobile.

## Ce qui est déjà réellement en place

- **52 tables publiques**.
- **RLS activé sur 52/52 tables**.
- **Clé primaire présente sur 52/52 tables**.
- Les tables critiques attendues sont présentes : comptes/profils, articles, planning, absences, tâches, chat, notifications, réglages, audit et e-mails de récupération.
- Le socle serveur du 3 octobre 2026 fournit déjà la hiérarchie de rôles, le contrôle de session active et une politique deny-by-default pour les futurs objets publics.

## Source de vérité par domaine

| Domaine | Source canonique |
| --- | --- |
| Comptes / profil / rôles | `profiles`, `app_roles`, `app_subroles`, permissions associées |
| Planning | `planning_weeks`, `planning_absences`, `planning_logs` |
| Articles / stock | `products`, taxonomie articles, `stock_history` |
| Tâches du jour | `daily_task_catalog`, `daily_tasks`, affectations et validations |
| Chat | conversations, participants, messages, réactions, états utilisateur |
| Notifications | règles, préférences, contrôles, `planning_notifications` |
| Opérations | commandes, livraisons, flashes |
| Configuration | `app_settings`, `app_options` |
| Audit | `audit_logs`, `portal_change_logs`, `login_history` |
| Récupération de compte | `user_recovery_emails`, demandes de réinitialisation |

## Ce qui peut rester local

Le stockage local est autorisé uniquement pour une préférence ou un cache reconstructible :

- thème clair/sombre ;
- onglet ou panneau actuellement ouvert ;
- version PWA installée / état de mise à jour ;
- cache local du catalogue stock pour accélérer l'ouverture ;
- préférence Nethor liée à la caméra ;
- données temporaires d'assistance du scanner.

Ces valeurs ne doivent jamais devenir la seule copie d'une donnée métier.

## Ce qui ne doit jamais être canonique dans localStorage

- planning ;
- comptes, rôles et permissions ;
- articles et quantité de stock ;
- congés / indisponibilités ;
- tâches du jour ;
- messages et conversations ;
- notifications lues/non lues ;
- configuration administrateur métier ;
- commandes, livraisons ou autres données opérationnelles.

## Première brique Phase A ajoutée

La fonction RPC `public.nethor_data_architecture_health()` fournit à l'administrateur un état de santé structurel de la base :

- nombre de tables publiques ;
- nombre de tables avec RLS ;
- tables sans RLS ;
- tables sans clé primaire ;
- tables métier critiques manquantes ;
- colonnes JSON/JSONB métier à surveiller lors des futures normalisations.

Elle est **SECURITY INVOKER**, inaccessible à `anon`, et refuse l'appel si le compte courant n'a pas le rôle Administrateur.

### Résultat de validation initial

```text
public_tables: 52
rls_enabled: 52
tables_without_rls: []
tables_without_primary_key: []
critical_tables_missing: []
```

## Points à traiter dans la suite de la Phase A

### A1 — Inventaire architecture
**Terminé.**

### A2 — Contrat "source unique de vérité"
**Terminé pour le socle.** Les caches locaux restent tolérés uniquement s'ils sont reconstruisibles depuis Supabase.

### A3 — Contrôle automatique d'intégrité DB
**Terminé.** RPC `nethor_data_architecture_health()` appliquée et testée avec un contexte Administrateur authentifié.

### A4 — Historique DB entièrement versionné
**En cours.** La réconciliation a été démarrée le 3 octobre 2026.

État mesuré :
- 107 migrations enregistrées dans Supabase ;
- 38 artefacts SQL présents dans `database/` ;
- registre canonique des migrations créé avec hash du SQL live ;
- empreinte structurelle de production créée pour tables, fonctions, vues, politiques RLS, triggers et index ;
- inventaire GitHub des artefacts SQL créé ;
- 4 migrations historiques contenant des UUID littéraux classées comme spécifiques à l'environnement afin d'éviter un rejeu aveugle sur une nouvelle instance.

Références : `database/reconciliation/`.

Étape suivante : produire la matrice migration Supabase → fichier GitHub → niveau de rejouabilité, puis construire un historique ordonné pouvant être restauré sur une base vierge hors production.

### A5 — Couche d'accès aux données commune
**À faire.** Introduire une couche commune pour les opérations récurrentes (profil, planning, articles, tâches, notifications) afin que Desktop et Mobile utilisent le même contrat de données au lieu de répéter des requêtes dans chaque page.

### A6 — Planning
Le planning est déjà centralisé dans `planning_weeks`, mais le modèle principal reste encapsulé dans un document JSONB. **Ne pas le normaliser brutalement.** La normalisation devra être préparée en parallèle du futur moteur Planning, avec compatibilité ascendante et migration testée.

### A7 — Sauvegarde / restauration de schéma
**À faire avant Phase B.** Préparer une procédure vérifiable permettant de reconstruire le schéma, les fonctions, politiques RLS et permissions depuis le dépôt, puis tester une restauration hors production.

## Alertes existantes à ne pas confondre avec une régression Phase A

Les Advisors Supabase signalent encore des fonctions historiques `SECURITY DEFINER`, la protection contre mots de passe compromis désactivée, des index encore inutilisés et deux politiques UPDATE permissives sur `planning_absences`. La nouvelle fonction Phase A n'ajoute aucun nouvel avertissement `SECURITY DEFINER`.

Ces éléments seront traités dans les phases sécurité/performance appropriées après analyse de leur usage réel.

## Règle pour toute nouvelle table

1. clé primaire obligatoire ;
2. RLS activé ;
3. privilèges Data API explicitement accordés uniquement aux rôles nécessaires ;
4. politiques minimales par action ;
5. FK pour les relations réelles ;
6. `created_at` / `updated_at` lorsqu'ils sont nécessaires au métier ;
7. migration SQL versionnée dans GitHub avant ou immédiatement après application contrôlée ;
8. test de non-régression et nouvel appel à `nethor_data_architecture_health()`.

La Phase A est désormais officiellement ouverte sur la branche `phase-a-architecture-database-20261003`.

# Nethor — Étape 16 : audit des sessions et RPC sensibles
Date : 12 octobre 2026. Projet Supabase : `gioxrpaiwogqqtakjpnv`.
Périmètre : **lecture seule de la base réelle**, revue de fonctions, contrôles de CI. PR GitHub : #40.

## Résultat et niveau de confiance

**Conclusion : NO-GO pour fusion et production.**
L'architecture Planning dispose bien de protections réelles, mais plusieurs chemins RPC qui utilisent `SECURITY DEFINER` ne refont pas systématiquement le contrôle de session. Une proposition de remédiation est enregistrée dans `docs/security/etape16-rpc-hardening-proposal.sql`, **non exécutée**.

Les observations concernent le code SQL et les privilèges effectivement lus sur le projet. Aucun appel authentifié avec un jeton de session révoquée n'a été réalisé ; l'impact en environnement réel doit être confirmé par tests d'intégration dédiés. Les intitulés de risque n'impliquent pas qu'une intrusion a eu lieu.

## Points confirmés par des requêtes SQL en lecture seule

| Contrôle | Observation | Interprétation |
|---|---|---|
| `private.session_is_active()` | Lie `auth.uid()` au `session_id` du JWT, à `auth.sessions`, à `account_enabled=true` et à `sessions_valid_after` | Contrôle de révocation côté serveur présent |
| Comptes désactivés possédant encore une session Auth | **0** | Aucune session restante observée pour ces comptes |
| Sessions antérieures au seuil `sessions_valid_after` | **0** | Aucun cas observé dans l'inventaire |
| Comptes actifs sans seuil `sessions_valid_after` | **0** | Aucun défaut observé sur ce champ |
| Appel `private.session_is_active()` sans identité utilisateur dans la session SQL d'audit | `false` | Fail-closed de cette fonction dans ce contexte uniquement |
| Appel `private.can_module(NULL,'planning','manage')` | `false` | Refus sans identité dans ce contexte uniquement |
| `nethor_active_session_guard` | **52 politiques RLS restrictives, 0 permissive** | S'ajoute aux autres politiques au lieu de les remplacer |
| `planning_save_week_if_revision` / `planning_delete_week_if_revision` | Vérifications `private.session_is_active()`, `private.can_module(...,'planning','manage')`, révision attendue | Contrôles serveur présents, sans test interactif |
| Droit direct de modification sur `planning_weeks` par `authenticated` | Pas de GRANT INSERT/UPDATE/DELETE au niveau table constaté | Écritures via RPC contrôlées, sous réserve de l'audit des privilèges colonne et des autres routes |
| `admin_set_account_enabled` | `EXECUTE` accordé à service_role, pas à authenticated ; suppression des sessions lors de la désactivation | Circuit d'administration séparé des sessions ordinaires |

**Précision importante :** Une policy RLS ne suffit pas à sécuriser un RPC `SECURITY DEFINER` exécuté avec les privilèges du propriétaire. Son corps doit contrôler explicitement l'identité, la session, et la permission applicable.

## Écarts observés et portée de la proposition SQL

1. `private.list_team_members_impl()` : renvoie une liste de profils en ne vérifiant que `auth.uid() IS NOT NULL` ; l'existence d'une session encore active n'est pas vérifiée.
2. `private.chat_can_manage(conversation,user)` : décide à partir du rôle ou de la participation sans vérifier la session, ni rattacher directement `p_user` à l'appelant authentifié. Appelé notamment par l'archivage, la suppression et la modification de groupes.
3. `public.admin_notification_rules()` et `public.admin_notification_users()` : contrôle `role='admin'`, mais pas la session encore active. Les fonctions sont `SECURITY DEFINER` et `EXECUTE` est accordé à `authenticated`.
4. `public.chat_presence_ping()`, `chat_mark_all_read()`, `chat_mark_read()`, `chat_set_muted()`, `chat_set_user_conversation_state()` : contrôlent une identité ou une participation, mais la révocation n'est pas systématiquement revalidée dans leur corps.
5. `public.my_subrole_keys()` et `my_subrole_permissions()` : lecture liée au `auth.uid()` sans filtre de session active.
6. `public.weekly_poll_results()` : vérifie l'identité et `account_enabled`, mais non l'existence de la session Auth.

**Risque :** avec un ancien JWT toujours cryptographiquement valide, certaines fonctions peuvent répondre alors que la session a été révoquée. Cela reste un risque conditionnel jusqu'à un test authentifié ; ce n'est pas une preuve d'accès malveillant.

Source technique : [Supabase — sessions utilisateur](https://supabase.com/docs/guides/auth/sessions) et [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Changement préparé, non appliqué

`docs/security/etape16-rpc-hardening-proposal.sql` :

- reconstruit **12 fonctions existantes**, à partir des définitions lues dans le backend ;
- ajoute `private.session_is_active()` aux chemins non couverts, sans altérer les structures de données ;
- pour `private.chat_can_manage`, exige que `p_user` soit l'utilisateur effectif du JWT ;
- préserve les signatures, modes `SECURITY DEFINER`, et `search_path` d'origine ;
- contient **12 préconditions MD5** sur le texte original des fonctions (prévention d'écrasement d'une version plus récente) ;
- contient `BEGIN` / `COMMIT`, destinés à rendre atomique une application future, après validation ;
- ne contient aucune mise à jour des profils, des sessions, des politiques RLS ou des données.

**Attention :** une vérification statique et des préconditions MD5 ne prouvent pas que le SQL est opérationnel. Cette proposition exige des tests de compilation et d'intégration sur une base isolée. Elle est volontairement située sous `docs/security` et **pas** dans un répertoire de migrations automatiquement déployées.

## Contrôles CI de la proposition

`tests/security-step16-proposal.test.cjs` valide :
- présence des 12 fonctions et de leurs contrôles de session dans le texte SQL proposé ;
- préconditions MD5, bloc transactionnel, absence de mutations directes de données ;
- lien à `auth.uid()` pour les autorisations d'équipe / de gestion Chat.

Ces assertions sont exécutées par GitHub Actions. **Elles ne simulent pas une session Supabase révoquée et ne compilent pas le SQL en base.**

## Reste à traiter (risques résiduels)

- Examiner les autres RPC de type `SECURITY DEFINER`, notamment `chat_leave_conversation`, `scan_products_by_ean`, `scan_product_hypotheses` et leurs helpers `private.can_page_access` ; ne pas élargir la modification sans revue des dépendances.
- Distinguer les RPC conçus pour une consultation anonyme, en particulier `get_public_login_config()` (configuration publique de connexion), des RPC nécessitant une session active.
- Faire un audit complet des privilèges colonnes, Storage, Edge Functions et RPC de gestion des comptes.
- Réaliser dans un projet **isolé** les tests avec comptes factices : Admin, Point de vente, Responsable, Employé, Lecture seule, puis session révoquée/désactivée. Vérifier les réponses de lecture et mutation sur chaque rôle.
- Tester les parcours desktop, PWA installée, reprise réseau, déconnexion forcée, et conservation des historiques.
- Comparer les signatures et les MD5 du SQL avant tout déploiement ; conserver un export vérifié des définitions précédentes pour retour arrière.
- Autoriser la publication seulement après revue formelle de sécurité, intégration validée, CI verte, et accord de déploiement.

## Décision de l'étape
- Audit SQL en lecture seule : **réalisé**.
- Correctif SQL : **préparé sur la PR #40, non appliqué à Supabase**.
- Test automatisé statique : **enregistré dans la CI**.
- Essais serveur avec vraies sessions : **non réalisés**.
- Production `nethor.fr` et base : **inchangées**.
- **NO-GO / PR Draft**.

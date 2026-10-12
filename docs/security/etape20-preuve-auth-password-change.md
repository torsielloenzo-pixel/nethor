# Nethor — Étape 20 : preuve Auth du mot de passe modifié

**Date :** 12 octobre 2026  
**PR :** [#40](https://github.com/torsielloenzo-pixel/nethor/pull/40) — brouillon, production inchangée.

## Constats en lecture seule

La page `reset-password.html` appelle `db.auth.updateUser({password:next})`, puis transmet une notification `action:'resolved'` à `password-recovery-email`. Le premier appel effectue réellement la modification via Supabase Auth ; le second pouvait auparavant marquer la demande `resolved_at` sans aucune preuve serveur que le mot de passe avait changé.

Le backend possède `auth.users.encrypted_password` et les demandes dans `public.password_reset_requests`, avec `reset_channel`, `email_status`, `requested_at` et `resolved_at`. Il ne possédait pas de marqueur séparant « utilisateur a signalé le succès » de « Auth a constaté le changement de mot de passe ». Un `updated_at` générique n'est pas une preuve de modification du mot de passe.

**Aucune donnée de compte, mot de passe, empreinte réelle ni jeton n'a été extrait pour cette étape.** Seul le schéma a été lu.

## Modification préparée — non déployée

### Base de données : observation du changement par Auth

[SQL proposé](etape20-confirmation-auth-verifiee-proposal.sql) — **à ne pas exécuter en production sans tests de staging et approbation**.

- Ajout de trois champs de suivi : `password_changed_verified_at`, `confirmation_notification_at`, `confirmation_notification_status`.
- Un trigger `AFTER UPDATE OF encrypted_password` sur `auth.users` observe un changement réel d'empreinte, sans conserver cette empreinte ailleurs.
- Il marque les demandes e-mail effectivement envoyées, non résolues, liées au bon utilisateur et datant de moins de 24 heures.
- Une mise à jour du profil, une empreinte identique, une demande non envoyée, une demande ancienne ou un autre canal **ne suffit pas** à les résoudre.
- **Limite :** cela prouve qu'un mot de passe a changé dans Supabase Auth, pas nécessairement que le lien e-mail précis a été utilisé : un administrateur peut modifier un mot de passe aussi.

**Risque opérationnel particulier :** modifier `auth.users` via un trigger est sensible. Toute erreur dans ce trigger peut bloquer une mise à jour Auth. [Supabase documente ce risque](https://supabase.com/docs/guides/troubleshooting/dashboard-errors-when-managing-users-N1ls4A). Les tests PostgreSQL jetables ne remplacent pas un test complet dans un projet Supabase indépendant.

### Edge Function : ne plus croire le signal client

[Fonction candidate](edge-functions/password-recovery-email/index.ts), non déployée.

- `resolved` vérifie toujours `auth.getUser()` et `nethor_security_context.session_active`.
- Elle lit la **demande e-mail la plus récente** et exige `password_changed_verified_at` calculé par la base ; sinon répond `409` (preuve absente) ou `503` (indisponibilité de la vérification).
- Une opération atomique `UPDATE ... WHERE confirmation_notification_at IS NULL RETURNING id` réserve la notification une seule fois, même si deux onglets confirment simultanément.
- Un doublon ne renvoie pas un second e-mail ni un second événement d'audit.
- Le journal ne décrit désormais un `password_change_auth_verified` qu'après observation de la preuve. La notification est suivie avec `sent`, `failed` ou `skipped` ; un échec ne doit pas falsifier le statut du changement de mot de passe.
- La demande publique `action:'request'` demeure accessible sans connexion, comme auparavant.
- **Limite :** une notification échouée ne fait pas encore l'objet d'une nouvelle tentative automatique ; son statut est conservé pour traitement ultérieur.

### Interface : succès Auth et accusé serveur distincts

[Page proposée](../../reset-password.html).

- Le message « mot de passe modifié » dépend uniquement du succès de `db.auth.updateUser`.
- L'accusé `password-recovery-email` est indépendant : `verified===true` confirme le suivi serveur ; sinon la page signale un suivi restant à confirmer.
- L'utilisateur peut se reconnecter après un vrai succès Auth, même si le réseau a empêché l'accusé de suivi. Il n'est pas incité à changer deux fois son mot de passe.

## Tests nouveaux et conservés

- `tests/security/stage20-fixture.sql` : utilisateurs Auth et demandes complètement fictifs.
- `tests/security/stage20-assertions.sql` : exécution du trigger dans PostgreSQL 17 jetable ; vrais UPDATE de fausses empreintes de mot de passe, vérification des demandes admissibles et refus des autres cas.
- `tests/security-step19-recovery-edge.test.cjs` : exécution de la branche `resolved` du code candidat avec clients mockés, dont 401, 409, 503, preuve valide, doublon, notification échouée et absence de requête privilégiée en cas d'erreur.
- `.github/workflows/nethor-regression.yml` continue de valider les 12 autres RPC et les scénarios de révocation de sessions.

Les deux mécanismes (SQL et Edge) sont encore **des propositions combinées** : il serait dangereux de déployer seulement l'Edge Function sans les nouveaux champs et le trigger.

## Conditions avant toute publication

1. Créer ou utiliser un projet Supabase de staging séparé, après vérification et accord sur les coûts éventuels.
2. Tester les changements de mot de passe **réels** via Supabase Auth, sans manipuler de mots de passe du magasin.
3. Vérifier les autorisations de la fonction déclenchée et l'absence d'erreur Auth ; prévoir un retour arrière **sans effacer** les champs d'audit déjà remplis.
4. Vérifier l'e-mail Resend, les liens expirés/utilisés, les nouvelles tentatives, les onglets concurrents et la récupération d'un compte désactivé.
5. Tester les authentifications mobile/PWA et desktop avec comptes de test, et confirmer l'effet des déconnexions/révocations.
6. Auditer les autres chemins de modification de mot de passe (administration, mise à jour directe) pour ne pas attribuer à tort la preuve à un lien e-mail précis.
7. Contrôler le risque de concurrence lors de la confirmation entre la vérification de session et les opérations `service_role`.

**Décision : NO-GO**. SQL, Edge Function et page restent dans la PR #40 ; pas de migration, pas de déploiement ni de modification des comptes et données réels.

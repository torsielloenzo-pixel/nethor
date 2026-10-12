# Nethor — Étape 24 : revue préproduction et plan de déploiement

**Date :** 12 octobre 2026. **PR :** [#40](https://github.com/torsielloenzo-pixel/nethor/pull/40) en brouillon.  
**Statut :** **NO-GO pour production** : dossier prêt pour l'étape 25, mais plusieurs validations indispensables restent ouvertes.

## 1. Correctif de sécurité finalisé dans la PR, non déployé

Le problème de l'étape 22 était réel **dans la proposition étape 20** : un changement classique du mot de passe par Auth positionnait aussi `resolved_at` sur une demande de récupération e-mail non utilisée.

Le correctif préparé en étape 24 sépare les preuves :

1. **Événement Auth** : le trigger candidat `docs/security/etape20-confirmation-auth-verifiee-proposal.sql` note un changement réel d'empreinte dans `password_changed_verified_at`, mais **ne modifie plus `resolved_at`**.
2. **Preuve de possession du lien précis** : `password-recovery-email` crée une demande `pending` avant l'envoi, avec un identifiant unique et un **SHA-256 du jeton de récupération Supabase** dans `recovery_proof_digest`. Le jeton brut n'est pas stocké dans cette table.
3. **Lien remis au destinataire** : l'e-mail contient `token_hash` (jeton Supabase, nécessaire à la vérification Auth) et `request_id`; l'identifiant lie le lien à une ligne précise. L'état du courrier devient `sent` uniquement après réussite de l'envoi.
4. **Vérification côté Auth** : `reset-password.html` consomme le jeton avec `verifyOtp`, puis appelle `updateUser` pour le changement réel. Les paramètres sensibles sont effacés de l'URL visible ; le jeton est conservé seulement dans la mémoire de la page tant que celle-ci est ouverte.
5. **Accusé ciblé** : après `updateUser`, le navigateur présente `request_id` et `token_hash` à l'action `resolved`. Celle-ci vérifie le JWT, `nethor_security_context.session_active`, l'identité, l'existence de la ligne spécifique, l'empreinte et le changement Auth constaté.
6. **Résolution unique** : la mise à jour `resolved_at` et la réservation de notification sont atomiques (`resolved_at IS NULL` et `confirmation_notification_at IS NULL`). Un appel sans preuve ou un appel concurrent ne peut pas créer un deuxième envoi.
7. **Retours sûrs** : refus `400` en cas de preuve absente, `409` pour preuve incorrecte ou changement non observé, `401` pour session révoquée, `503` pour défaillance du suivi.

**Limite de preuve** : la possession du jeton de récupération et l'observation d'un changement Auth ne prouvent pas cryptographiquement que `verifyOtp` a consommé CE jeton ni que le changement de mot de passe résulte de ce lien plutôt que d'une autre opération Auth. Le cas normal de clôture injustifiée est corrigé dans la proposition, mais un processus d'audit plus strict pourrait exiger un événement Auth de récupération vérifiable et lié au token. **Ne pas présenter `resolved_at` comme une preuve irréfutable d'usage d'un lien.**

**Sécurité d'exploitation** : les liens de récupération déjà émis **sans `request_id`** ne peuvent pas être confirmés par cette nouvelle logique. Avant publication, prévoir leur expiration normale ou une transition qui n'attribue pas artificiellement une demande ; ne pas publier l'Edge Function et le schéma indépendamment.

## 2. Essais automatisés présents

| Domaine | Ce qui est démontré | Ce qui n'est pas démontré |
|---|---|---|
| 12 RPC `SECURITY DEFINER` | Compilation et réponses de révocation dans PostgreSQL 17 jetable | Toutes les politiques de production et tous les appels Edge |
| Supabase Auth local | Véritables JWT GoTrue, révocation et désactivation | Des comptes réels du magasin ou Auth production |
| 5 rôles | Matrice Planning/Chat et RLS/sauvegarde sur la même semaine **synthétique** | Gestion complète du magasin sur appareils réels |
| Récupération e-mail | Nouvelles conditions de preuve et de rejet dans des tests Node mockés, plus changements de hash dans PostgreSQL | E-mail Resend réel, navigateur connecté à une instance Supabase de préproduction, runtime Deno exécutant l'Edge Function |
| Mobile/desktop | Formulaires de connexion et de récupération en Chromium 375/390/1024/1440 px | Safari iOS réel, PWA installée, planning connecté et orientation |
| Offline et cache | Tests JS du refus de synchronisation lors d'un RPC non validé | Comportement réel du cache PWA lors d'une session révoquée |

Tests :
- `tests/security-step19-recovery-edge.test.cjs`
- `tests/security-stage24-request-link.test.cjs`
- `tests/security/stage20-assertions.sql`
- `tests/security/stage22-local-auth-integration.cjs`
- `tests/security/stage23-local-role-planning.cjs`
- `tests/ui/stage23-viewport-smoke.cjs`

**Un test automatisé vert n'est pas une autorisation de fusion.** Les artefacts proposés sous `docs/security` restent **hors déploiement automatique**.

## 3. Tableau des portes de sortie — étape 25

| Gate | Exigence vérifiable | Statut |
|---|---|---|
| **S1 – Code en branche** | Corrections et CI sans échec sur le dernier commit | À confirmer sur la dernière CI |
| **S2 – Récupération complète** | Supabase de staging + Edge Function Deno + Auth réelle + Resend d'essai + lien valide/expiré/déjà utilisé, succès et relecture | **BLOQUANT : non effectué** |
| **S3 – Safari / PWA** | Vrai iPhone Safari puis PWA installée : login, planning, changement semaine, offline, reconnexion, clôture de session | **BLOQUANT : non effectué** |
| **S4 – Cinq rôles en UI réelle** | Même semaine et mêmes collaborateurs sur desktop/iPhone avec rôles fictifs; vérification import et interdictions d'écriture | **BLOQUANT : non effectué** |
| **S5 – Opérations sensibles** | Tests réels des Edge Functions Admin, Chat, notifications, Resend, exclusions comptes inactifs | **BLOQUANT : partiel** |
| **S6 – Gouvernance production** | Approbation explicite du propriétaire, créneau de déploiement, journal de changements et rollback testés | **BLOQUANT : non effectué** |

La **décision attendue de l'étape 25 est NO-GO** si l'un des bloqueurs reste ouvert. Le plan d'étapes borne le chantier, pas les défauts réels : un point bloquant n'est pas déclaré résolu seulement parce qu'on atteint l'étape 25.

## 4. Préparation opérationnelle, sans exécution

**Avant la moindre écriture en production :**

1. Comparer la PR à `main` : liste des migrations/fonctions, versions PWA (457), contenu des Edge Functions et variables d'environnement. Le dépôt a évolué : ne pas écraser une fonction devenue plus récente qu'au moment de l'audit.
2. Sauvegarder de manière vérifiable les fonctions SQL, politiques, configurations Auth et données utiles ; documenter qui peut restaurer. Ne pas exporter les comptes ni leurs jetons dans les logs de CI.
3. Tester **les deux composants ensemble** sur staging : SQL avec `recovery_proof_digest`, puis Edge Function et page de récupération. Confirmer la cohérence de l'ancien lien et du nouveau lien. Sur production, programmer la fenêtre de bascule pour ne pas interrompre les utilisateurs.
4. Auditer minutieusement l'effet du trigger sur `auth.users` (erreur de trigger = risque de blocage des modifications Auth) et son propriétaire `SECURITY DEFINER`. Vérifier les grants nécessaires sans étendre l'accès aux données.
5. Revalider la révocation des sessions, la MFA selon rôles, les contrôles serveur dans toutes les Edge Functions et les quotas des endpoints de récupération, en évitant l'énumération des comptes.
6. Examiner le cache PWA, les liens de login, la propagation de l'import de planning, les sessions desktop/mobile et les performances sur des appareils réels.
7. Conserver une procédure de rollback **sans supprimer les marqueurs d'audit** : restauration du code Edge et PWA, retrait contrôlé du trigger si nécessaire, préservation des colonnes de suivi et examen des demandes en cours.
8. Ajouter une validation et une surveillance après publication : test login par rôle, affichage du planning de la semaine, modification admin contrôlée et absence d'erreurs répétées ou de notifications en double.

**Rappel de protection :** ne pas appliquer directement le SQL de `docs/security` à Supabase production, ne pas fusionner `main` ni déployer `nethor.fr` sans validation explicite et complète.

## 5. Décision

**Étape 24 : correctif du défaut d'attribution préparé, non déployé ; dossier prêt à instruire la décision GO/NO-GO de l'étape 25.**

Le chantier de refonte reste **NO-GO / Draft** tant que les tests Auth/Resend sur une instance complète et les tests iPhone/PWA physiques ne sont pas réalisés.

# Nethor — Étape 17 : validation PostgreSQL isolée des sessions révoquées

Date : 12 octobre 2026. PR : #40, branche `refonte-professionnelle-planning-20261012`.

## 1. Environnement de validation

Aucune branche Supabase de développement n'était disponible (résultat de `list_branches` : `[]`). Aucune ressource Supabase facturable n'a été créée. La production n'a pas été modifiée.

À la place, GitHub Actions démarre un service temporaire **PostgreSQL 17**, initialisé avec des tables et identités de test inventées. Le service est supprimé à la fin de chaque exécution.

Sources des fonctions testées :
- `tests/security/stage17-session-guard-snapshot.sql` : **copie de la définition SQL réelle** de `private.session_is_active()` obtenue par audit en lecture seule ; signature du texte original `md5(pg_get_functiondef)` : `c6f123abb320f81ef5b7a99086d7be15`.
- `docs/security/etape16-rpc-hardening-proposal.sql` : propositions **non déployées** pour `private.list_team_members_impl()` et `private.chat_can_manage(...)`.
- `tests/security/stage17-extract-functions.cjs` : extrait les deux fonctions depuis le SQL effectivement proposé, sans duplication manuelle.
- `tests/security/stage17-fixture.sql` : profils, sessions `auth.sessions` et participants Chat synthétiques.
- `tests/security/stage17-assertions.sql` : scénarios de succès et de refus.

Le seul double de test est l'extraction des revendications `auth.uid()` et `auth.jwt()`, alimentée par des variables locales à la base jetable ; **l'identité réelle, le système d'émission et la signature des JWT Supabase ne sont pas reproduits**.

## 2. Scénarios exécutés dans le vrai moteur PostgreSQL

| Scénario | Résultat attendu | Validation |
|---|---|---|
| Session valide et compte actif | `session_is_active() = true` | PASS |
| Lecture d'équipe pour session valide | Liste des profils autorisés par la définition originale | PASS |
| Propriétaire d'un groupe avec session active | Gestion Chat autorisée | PASS |
| Usurpation de l'identité Admin dans le paramètre `p_user` | Rejet | PASS |
| Session supprimée de `auth.sessions` | Accès équipe et gestion Chat refusés | PASS |
| Compte désactivé avec ancienne session encore présente | Session et liste d'équipe refusées | PASS |
| JWT avec `session_id` d'un autre utilisateur | Rejet | PASS |
| Session expirée (`not_after`) | Rejet | PASS |
| Session antérieure au seuil `sessions_valid_after` | Rejet | PASS |
| Administrateur actif et session valide | Gestion Chat autorisée | PASS |

Ces tests contrôlent la **logique SQL de révocation** et les deux fonctions ciblées avec des objets PostgreSQL synthétiques. Ils **ne démontrent pas** que les politiques Auth/RLS, les Edge Functions et l'ensemble des autres RPC fonctionneront sur le vrai projet après le déploiement.

## 3. Exécution CI vérifiée

GitHub Actions [« Nethor — Tests de fiabilité », run #1044](https://github.com/torsielloenzo-pixel/nethor/actions/runs/38302871127) :

- Job `Tests non destructifs — Node 22` : **133 tests réussis, zéro échec**.
- Job `Simulation révocation — PostgreSQL jetable` : **succès**.
- Les logs affichent le marqueur `stage17-security-fixture-passed`.
- Le service PostgreSQL de test a été arrêté et supprimé.

## 4. Audit complémentaire en lecture seule : Edge Functions

La liste Supabase contient **11 Edge Functions**. Les deux endpoints `password-reset-request` et `password-recovery-email` sont configurés avec `verify_jwt=false` ; cela peut être nécessaire pour une récupération de mot de passe avant connexion et **ne constitue pas en soi une vulnérabilité**.

Le code des fonctions, leur contrôle anti-abus, leurs limites de débit et leurs secrets n'ont pas été audités lors de cette étape. Les endpoints administratifs et Chat sont configurés avec `verify_jwt=true`, mais cette option **ne prouve pas une vérification instantanée des sessions révoquées** dans le corps des fonctions.

## 5. Réserves et prochaine porte de sortie

- Les **10 autres fonctions** de la proposition de l'étape 16 n'ont **pas encore été compilées** sur une base de test intégrale.
- Aucune connexion réelle aux rôles Admin, Point de vente, Responsable, Employé et Lecture seule n'a été effectuée.
- Aucun test iPhone/PWA ↔ ordinateur ni test réel d'une session Supabase révoquée n'a été effectué.
- Une branche Supabase dédiée, si elle est souhaitée, nécessite une vérification du coût et une approbation explicite avant création.
- Avant publication : compiler les 12 fonctions sur un environnement reproduisant le schéma réel, auditer les autres RPC et les Edge Functions, puis effectuer des essais authentifiés multi-rôles sur un environnement dédié.
- **NO-GO** maintenu pour le déploiement, la modification des RPC en production et la fusion de la PR #40.

Aucune table, session, politique RLS, compte ou donnée de la base réelle n'a été modifiée.

# Nethor — Étape 18 : couverture des 12 RPC et audit des Edge Functions

**Date :** 12 octobre 2026  
**Référence :** PR #40, branche `refonte-professionnelle-planning-20261012`  
**Décision :** **NO-GO pour la production** tant que les vérifications d'intégration Auth et PWA ne sont pas terminées.

## 1. Tests SQL : extension de 2 à 12 fonctions

Les 12 définitions SQL de `docs/security/etape16-rpc-hardening-proposal.sql` sont maintenant extraites automatiquement et **compilées**, puis exécutées, sur une **base PostgreSQL 17 jetable**, sans données du magasin.

Éléments de test :
- `tests/security/stage18-fixture-extension.sql` : tables et lignes fictives nécessaires aux 10 RPC supplémentaires (notifications, Chat, rôles secondaires, sondages).
- `tests/security/stage18-chat-helper-snapshots.sql` : copies en lecture seule de trois helpers privés réels, utilisés uniquement dans la CI.
- `tests/security/stage18-assertions.sql` : accès fonctionnels avec des sessions de test actives, puis refus après révocation.
- `tests/security/stage17-extract-functions.cjs` : extrait les 12 fonctions du **correctif proposé**, sans les recopier à la main.
- `.github/workflows/nethor-regression.yml` : compilation et assertions exécutées automatiquement.

Scénarios **ajoutés** : lecture de sous-rôles, consultation admin des règles et utilisateurs de notifications, présence Chat, lecture des conversations, mise en sourdine, état personnel des conversations, résultats des sondages. Ils vérifient la session active et plusieurs refus après suppression de `auth.sessions` tout en gardant les revendications du JWT fictif.

**Preuve CI :** [GitHub Actions #1050](https://github.com/torsielloenzo-pixel/nethor/actions/runs/38303496476), 2 jobs `success`. Les logs contiennent les marqueurs `stage17-security-fixture-passed` et `stage18-security-fixture-passed`. **133 tests Node réussis, 0 échec**, en complément des assertions PostgreSQL.

**Limite fondamentale :** PostgreSQL est réel, mais les identités, les tables de support et l'extraction des revendications du JWT sont synthétiques. Ce test ne remplace ni une application du SQL sur une branche Supabase indépendante ni un contrôle des autorisations réelles depuis des utilisateurs Auth.

## 2. Edge Functions : audit en lecture seule des 11 versions actives

Les codes des Edge Functions ont été inspectés en lecture seule via Supabase. Les versions sont celles visibles lors de l'audit ; **aucune fonction n'a été redéployée ou modifiée**.

| Fonction | Version | Vérification JWT déployée | Constat et suite |
|---|---:|---|---|
| `admin-manage-user` | 17 | Activée | `auth.getUser()` + `nethor_security_context.session_active` + rôle admin avant service role : architecture de vérification présente |
| `admin-create-user` | 6 | Activée | Point d'entrée obsolète, renvoie HTTP 410 ; vérifier ultérieurement l'absence de références actives |
| `chat-actions` | 10 | Activée | `auth.getUser(token)` + `nethor_security_context`, contrôles supplémentaires par conversation |
| `planning-push` | 14 | Activée | Vérification des appels authentifiés + branche serveur `system-send` distincte utilisant un secret ; auditer spécifiquement les appels machine-à-machine |
| `publish-preview` | 5 | Activée | Vérifications session/permissions présentes ; examiner les contrôles de publication et le retour arrière |
| `profile-email` | 6 | Activée | `auth.getUser` et contexte de sécurité ; confirmer les protections des changements d'adresse |
| `planning-import-audit` | 2 | Activée | Vérification session via contexte serveur avant les opérations privilégiées |
| `store-google-details` | 2 | Activée | `auth.getUser` et contexte de sécurité présents |
| `promotions-vision` | 3 | Activée | `auth.getUser` + `profiles` (RLS) + quota par RPC `reserve_promotion_vision_call` ; revérifier les limites de coût et de session en intégration |
| `password-reset-request` | 12 | Désactivée | Intentionnellement accessible avant connexion ; réponse générique et temporisation par profil de 30 s ; limitation par IP/CAPTCHA non constatée dans le code audité |
| `password-recovery-email` | 10 | Désactivée | Action `request` publique attendue ; action `resolved` appelle `auth.getUser()` mais **ne revalide pas explicitement `nethor_security_context.session_active`** avant modifications via service role |

`verify_jwt=false` est approprié pour certaines fonctions de récupération **tant que chaque action sensible exige une autorisation séparée**. Le statut configuré ne suffit pas à établir la sécurité effective d'une action.

## 3. Point prioritaire : `password-recovery-email` → `resolved`

La branche `resolved` de cette fonction reçoit un Bearer et vérifie `caller.auth.getUser()`, puis emploie le service role pour modifier l'état de demandes de réinitialisation du compte appelant. Contrairement aux endpoints principaux d'administration, aucune vérification explicite de `nethor_security_context.session_active` n'a été constatée entre ces étapes.

**Risque conditionnel :** un access token déjà émis, non expiré mais associé à une session révoquée, pourrait franchir `getUser()` alors qu'il devrait être refusé par la logique de Nethor. Cela doit être confirmé lors d'un essai Auth réel en staging ; aucun abus n'est affirmé.

### Proposition ciblée, NON appliquée

Dans `password-recovery-email/index.ts`, immédiatement après un `getUser()` réussi pour l'action `resolved`, **avant toute requête en service role** :

```ts
const { data: securityContext, error: securityError } =
  await caller.rpc("nethor_security_context");

if (securityError || securityContext?.session_active !== true) {
  return json({ error: "Session inactive ou révoquée." }, 401);
}
```

Ne pas appliquer aux demandes `request` non authentifiées : elles doivent rester accessibles à un utilisateur déconnecté, avec des protections anti-abus appropriées.

### Protection anti-abus des demandes publiques

`password-reset-request` applique une temporisation d'environ 30 secondes **par profil** après identification ; `password-recovery-email` utilise environ 120 secondes par profil. Les deux masquent en partie l'existence des comptes avec une réponse générique.

**À étudier avant publication :** quotas combinés IP / identifiant / destinataire, CAPTCHA adaptatif, journalisation sans données sensibles, et prévention des appels concurrents pour éviter la multiplication d'envois. Ne pas imposer une restriction qui empêcherait légitimement une récupération de compte.

## 4. Autres limites

- L'inspection statique des Edge Functions ne remplace pas les tests HTTP contre un environnement **isolé** avec des sessions Auth révoquées.
- Les secrets des fonctions n'ont pas été lus ni exposés ; aucun appel sortant à Resend ou OpenAI n'a été effectué lors de cet audit.
- Aucun déploiement Edge, aucune migration SQL, aucune modification RLS ni création de branche facturable.
- Reste à auditer : politiques Storage, privilèges de colonnes, chemins d'administration machine-à-machine, limites de débit réelles, tests des cinq rôles et appareils iPhone/desktop.

## 5. Porte de sortie

**Étape 18 : couverture SQL automatisée acquise, revue statique Edge Functions effectuée.**
La prochaine étape est de préparer la correction **non déployée** de `password-recovery-email`, puis une validation d'intégration Supabase Auth réelle sur un environnement indépendant, avec approbation des coûts éventuels.

**PR #40 maintenue en Draft ; production inchangée.**

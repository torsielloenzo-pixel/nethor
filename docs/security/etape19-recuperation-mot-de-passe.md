# Nethor — Étape 19 : récupération de mot de passe et sessions révoquées

**Date :** 12 octobre 2026  
**Branche :** `refonte-professionnelle-planning-20261012`, PR #40 (**Draft**)  
**Statut du correctif :** préparé pour revue ; **non déployé sur Supabase**.

## 1. Source audité et correctif proposé

La version **10** de l'Edge Function `password-recovery-email`, lue directement sur le projet Supabase `gioxrpaiwogqqtakjpnv`, possède la configuration `verify_jwt=false`. Il s'agit d'une configuration intentionnelle pour l'action `request`, qui doit rester utilisable par un utilisateur déconnecté.

Le code de l'action `resolved` authentifie déjà l'appelant avec `caller.auth.getUser()`, puis utilise un client `service_role` pour marquer des demandes comme résolues et journaliser le résultat. L'existence d'un utilisateur Auth n'établit pas, à elle seule, que la session de ce JWT est encore présente et autorisée dans Nethor.

**Fichier de remplacement candidat (source complet, hors déploiement automatique) :** `docs/security/edge-functions/password-recovery-email/index.ts`. Cette copie reprend la fonction déployée version 10 (identifiant SHA-256 du bundle communiqué par Supabase : `596543ea72815b7c77f785f1d116105bdb789db45fa089de6e9a928d4f5620e4`) et modifie uniquement le contrôle d'accès de `resolved`.

Juste après l'identification de l'utilisateur et **avant** le premier `admin.from(...)` de l'action `resolved` :

```ts
let sessionActive = false;
try {
  const { data: securityContext, error: securityError } =
    await caller.rpc("nethor_security_context");
  sessionActive = !securityError && securityContext?.session_active === true;
} catch {
  sessionActive = false;
}
if (!sessionActive) {
  return json({ error: "Session inactive ou révoquée." }, 401);
}
```

Cette vérification réutilise le contexte de sécurité de Nethor, notamment son contrôle des sessions dans `auth.sessions`, de l'activation du compte et de `sessions_valid_after`. Elle échoue de manière **fermée**, y compris lors d'une erreur de connexion au RPC.

## 2. Tests de non-régression

Le fichier `tests/security-step19-recovery-edge.test.cjs` exécute **réellement le corps de l'action `resolved` proposé** avec des clients Supabase et des appels réseau synthétiques, sans toucher aux services réels.

Scénarios :
1. Absence d'autorisation : 401, aucune lecture privilégiée.
2. `getUser` invalide ou sans utilisateur : 401, aucune lecture privilégiée.
3. `session_active=false`, null ou absent : 401 avant toute opération privilégiée.
4. Erreur renvoyée par le RPC : 401, aucune mutation.
5. Rejet/exception de transport du RPC : 401, aucune mutation.
6. Session confirmée : fonctionnement normal, résolution et audit.
7. Préservation du chemin public `request` : séparation des actions et absence de garde exigeant un JWT sur ce chemin.

Les contrôles statiques assurent également que la vérification du RPC précède le premier accès aux demandes de réinitialisation du service role.

Le test est intégré à `.github/workflows/nethor-regression.yml` avec les contrôles précédents ; la simulation PostgreSQL des 12 fonctions SQL reste active en parallèle.

## 3. Tests d'intégration restant nécessaires

Ces tests Node **simulent** les réponses Auth/RPC et n'exécutent pas l'Edge Function dans le runtime Supabase. Avant toute promotion :

- Sur une **instance Supabase distincte**, importer les définitions et paramètres requis, sans réutiliser des comptes ou secrets du magasin.
- Comparer la fonction déployée à la version d'origine v10, afin de ne pas écraser une version plus récente ; intégrer d'éventuels changements nouveaux.
- Configurer des comptes de test et simuler l'action `resolved` avec : session active, session déconnectée, compte désactivé, rôle modifié, session expirée et demande inexistante.
- Tester le vrai parcours `request` sans authentification, le mail de récupération et la confirmation après `updateUser` ; vérifier notamment que l'éventuelle rotation/révocation de la session pendant la réinitialisation ne bloque pas la confirmation légitime.
- Vérifier les comportements client avec HTTP 401 et perte de connexion.
- Évaluer le risque de concurrence entre l'autorisation `nethor_security_context` et les écritures via service role (TOCTOU) ; pour une révocation strictement atomique, préférer une mutation RPC sécurisée vérifiant la session dans la même transaction.
- Auditer également le fait que `resolved` peut actuellement marquer une demande comme résolue pour un utilisateur authentifié, sans preuve indépendante que le mot de passe vient effectivement d'être changé. Ceci dépasse le correctif de session et doit être traité avant de considérer l'événement d'audit comme une preuve de changement de mot de passe.

## 4. Anti-abus, sans modification du service public

L'action `request` reste non authentifiée et conserve le mécanisme actuel de temporisation par compte (~120 secondes). Cela préserve la récupération des comptes.

Une revue ultérieure devra envisager des limites par IP et par identité, la prévention des demandes simultanées, et une protection CAPTCHA adaptative si elle est justifiée, en évitant d'introduire de nouvelles possibilités d'énumération de comptes ou de bloquer injustement les utilisateurs.

## 5. Déploiement et retour arrière (procédure, non exécutée)

1. Confirmer l'approbation de la publication et la disponibilité d'un environnement de staging distinct.
2. Rejouer les tests sous Auth Supabase réel, puis faire une revue de code et des permissions.
3. Capturer la version de la fonction en cours de production et documenter le rollback ; ne pas publier aveuglément un snapshot v10 si la version live a évolué.
4. Déployer uniquement après validation formelle ; surveiller les codes 401, la réussite des récupérations et les journaux sans données personnelles sensibles.
5. En cas de régression, remettre la dernière version stable validée, sans modifier les comptes ni les données de réinitialisation.

**Décision : NO-GO.** Pas de déploiement de l'Edge Function, pas de changement Supabase et pas de fusion de PR #40 pendant l'étape 19.

# Nethor — Étape 21 : reconnexion PWA et feuille de route de sortie

**Date :** 12 octobre 2026. **PR :** #40 (Draft), branche `refonte-professionnelle-planning-20261012`. **Statut :** changements en préproduction GitHub, non déployés.

## Résultat technique

Revue de `ui/mobile/mobile-services.js` : en cas d'erreur de `nethor_security_context`, le client sollicitait `auth.getUser()` et retournait précédemment `true` pour un JWT encore valide. Cela ne prouvait pas l'existence d'une session `auth.sessions` encore active : le jeton pouvait rester valable temporairement après révocation. La branche `online` considérait ce `true` comme une autorisation de relancer une synchronisation générale.

**Correction effectuée sur la PR** :
- le contrôle ne retourne `true` que si `nethor_security_context` répond explicitement `session_active === true` et fournit un rôle non vide ;
- un JWT accepté par `getUser()` n'est jamais utilisé comme substitut au verdict serveur, et l'actualisation de reconnexion n'est pas lancée si l'autorisation demeure inconnue ;
- session révoquée `session_active === false` ou erreur d'Auth définitive : le mécanisme existant de déconnexion et nettoyage hors-ligne est conservé ;
- erreur réseau / RPC temporaire : réponse non validée (`false`) **sans** déconnexion arbitraire ;
- second contrôle en concurrence et mode hors-ligne : ne donnent pas un `true` anticipé ; réessais par le timer de vérification existant ;
- changement de rôle confirmé : rafraîchissement du profil et des permissions depuis le serveur.

**Portée :** cette correction ferme la **porte de synchronisation active** lors du retour réseau. Elle ne garantit pas à elle seule la fermeture immédiate de toutes les vues déjà ouvertes ni de chaque action UI lorsque le serveur est inaccessible. Les opérations serveur doivent toujours être refusées par RLS/RPC ; leur couverture réelle doit être validée par des sessions Auth révoquées en staging.

## Vérification automatisée

Nouvelle suite `tests/mobile-session-revalidation.test.cjs`, exécutée dans GitHub Actions :

1. session active acceptée uniquement sur un verdict serveur explicite ;
2. compte révoqué : déconnexion ;
3. erreur du RPC avec JWT encore valide : **refus de synchronisation**, conservation de la session locale ;
4. erreur du RPC avec Auth invalidée : déconnexion ;
5. RPC qui lève une exception : refus de synchronisation ;
6. hors-ligne et deux contrôles simultanés : aucun feu vert implicite ;
7. changement de rôle : relecture du profil ;
8. événement `online` : synchronisation uniquement après contrôle réussi ;
9. versions du script et du cache PWA cohérentes.

Entrée `mobile.html` : `mobile-services.js?v=26`. Service Worker : version 457, `netto-tools-v457`. Manifeste `app-version.json` : 457.

Les scénarios sont effectués avec des clients JS simulés ; les appels réels Supabase depuis iPhone et desktop ne sont pas encore testés.

## Les étapes restantes (plan borné)

L'objectif est **25 étapes au total**, et non un nombre indéfini. Après l'étape 21, **quatre étapes restent planifiées** :

| Étape | Livrable | Dépendance / critère de clôture |
|---|---|---|
| **22 — Staging et Auth réelle** | Préparation et, si approuvée, exécution des scénarios de révocation, récupération du compte et permissions des 12 RPC/Edge sur un Supabase indépendant | Création d'une branche/projet potentiellement facturable : présentation préalable du coût et approbation de l'utilisateur ; ne jamais expérimenter sur la production |
| **23 — Tests fonctionnels multi-rôles et appareils** | Comparaison d'un même planning sur ordinateur/iPhone PWA ; Admin, Point de vente, Responsable, Employé et Lecture seule ; offline/reconnexion ; import, notifications, chat | Accès à des comptes fictifs et tests manuels authentifiés nécessaires ; captures/retours d'essais, sans prétendre les avoir réalisés |
| **24 — Derniers correctifs et revue de sortie** | Résorption des défauts critiques, performance, compatibilité, accessibilité, documentation de retour arrière et suppression des risques bloquants | CI verte, aucun défaut P0/P1 ouvert, contrôle des versions déployables |
| **25 — Décision GO / NO-GO et déploiement approuvé** | Dossier final de validation, feu vert explicite, fusion/déploiement contrôlés et vérification post-déploiement | Approbation du propriétaire ; si les critères ne sont pas remplis, **NO-GO** sans déploiement |

Ce calendrier est une **prévision de travail**, pas une garantie qu'il ne restera aucun correctif. Des anomalies nouvelles peuvent bloquer la sortie ou nécessiter une remédiation supplémentaire.

**Décision actuelle : NO-GO**. Aucun test utilisateur réel ni écriture sur la base Supabase du magasin, aucune fusion sur `main`, aucun déploiement sur `nethor.fr`.

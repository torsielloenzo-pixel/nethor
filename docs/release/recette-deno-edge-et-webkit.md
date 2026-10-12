# Nethor — Recette de publication : Edge Deno réel et WebKit

**Date :** 13 octobre 2026  
**Statut :** **NO-GO sur `nethor.fr`**, essais exécutés seulement en CI isolée.  
**PR :** [#40](https://github.com/torsielloenzo-pixel/nethor/pull/40).

## 1. Validation supplémentaire réussie : code de la véritable Edge Function dans Deno

[GitHub Actions Auth locale #38](https://github.com/torsielloenzo-pixel/nethor/actions/runs/38315953383) : **SUCCESS**, avec la suite stages 22, 23, 26 et 27.

La validation nouvelle exécute **le corps réel de la fonction candidate** `docs/security/edge-functions/password-recovery-email/index.ts` dans un processus Deno. Pour ce test uniquement, une copie temporaire redirige l'URL d'API Resend vers une boîte e-mail locale en mémoire : le **fichier candidat du dépôt n'est pas modifié par cette substitution**.

Mesures d'isolement :
- GoTrue/PostgREST/PostgreSQL en conteneurs Supabase CLI locaux sur un runner GitHub temporaire ;
- seuls `127.0.0.1` et `localhost` sont autorisés comme destinations du processus Deno ;
- comptes, mots de passe, adresses `example.test`, identité et planning entièrement synthétiques ;
- aucune ressource du projet Supabase hébergé, aucune vraie API Resend et aucun envoi à un tiers ;
- le script refuse explicitement l'absence d'environnement local ;
- les dépendances sont mises en cache par Deno avant la restriction réseau ;
- les fichiers provisoires et les conteneurs sont supprimés à la fin.

### Scénarios réellement validés

| Contrôle | Résultat |
|---|---|
| Requête publique pour une adresse inconnue : réponse générique sans envoi | PASS |
| Requête publique pour compte fictif : courriel capturé localement, `request_id` et jeton Auth émis | PASS |
| Empreinte SHA-256 conservée dans la demande, sans jeton brut en base | PASS |
| Refus de confirmation avant changement Auth | PASS |
| Refus d'un autre utilisateur et d'une preuve incorrecte | PASS |
| Vérification Auth effective du jeton de récupération, refus d'une deuxième vérification | PASS |
| Changement de mot de passe Auth et suivi via trigger sans clôture automatique | PASS |
| Clôture avec preuve correspondante par **l'Edge Function Deno**, notification une seule fois | PASS |
| Ancien mot de passe refusé ; nouveau mot de passe accepté | PASS |
| Compte désactivé : l'Edge Function refuse l'opération protégée | PASS |

Les logs attestent des marqueurs `stage27-deno-...-PASS` et `stage27-deno-real-handler-local-auth-complete`.

**Portée exacte :** la fonction est exécutée par Deno avec des clients Supabase Auth réels, mais **pas** à travers le déploiement Supabase Edge hébergé ni avec le réseau/les quotas réels de Resend. Un simple serveur local substitue le fournisseur de mails. Cela représente une forte preuve de fonctionnement, mais **pas encore un test complet de la distribution en production**.

## 2. Recette de rendu navigateur

La CI de vues `.github/workflows/nethor-viewport-staging.yml` a été enrichie pour faire les mêmes contrôles dans **Chromium ET WebKit**, en 375 × 812, 390 × 844, 1 024 × 768 et 1 440 × 900.

Le script `tests/ui/stage23-viewport-smoke.cjs` :
- ouvre la connexion et la récupération, vérifie le layout, le débordement horizontal et les champs ;
- déclenche une validation locale d'erreur de confirmation ;
- intercepte ou refuse **tous** les accès réseau externes ;
- sauvegarde des captures préfixées `chromium-` ou `webkit-`.

Le moteur **WebKit sous Linux n'est pas Safari iOS**, ni une PWA installée sur un iPhone réel. Aucune ligne de la recette physique n'est automatiquement déclarée PASS grâce à ces tests.

## 3. Ce qui conditionne désormais la publication

1. **Vrai iPhone Safari et PWA installée** : planning et navigation après connexion à un environnement isolé, import de dernière semaine, rôle, rotation, offline/reconnexion et désactivation en direct.
2. **Préproduction opérationnelle indépendante** : déploiement de la vraie fonction via la passerelle Supabase, courrier réel vers un **destinataire de test** (Resend), lien valide, expiré, déjà utilisé, double demande et pannes ; prévoir accord avant création d'une ressource hébergée éventuellement facturable.
3. **Sécurité** : contrôle des autres Edge Functions et des avis Supabase `SECURITY DEFINER`, vérification des restrictions administrateur, politique RLS/Storage, protections anti-abus, et test de restauration.
4. **Feu vert de déploiement explicite** après gel du commit candidat, comparaison avec `main` et vérification de versions des services.

**Ne pas fusionner la PR #40, ne pas modifier `main`, ne pas pousser les propositions SQL dans Supabase production ni publier la refonte sans ces critères.**

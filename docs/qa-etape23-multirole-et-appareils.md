# Nethor — Étape 23 : recette multi-rôles et multi-appareils

**Date :** 12 octobre 2026  
**Branche / PR :** `refonte-professionnelle-planning-20261012` / [#40](https://github.com/torsielloenzo-pixel/nethor/pull/40) (**Draft**).  
**Production :** strictement inchangée. **Décision :** NO-GO.

## A. Validation avec cinq véritables comptes Supabase Auth fictifs

**Réussi dans une base locale Supabase Auth (GoTrue + PostgREST + PostgreSQL) jetable**. Elle contient seulement des utilisateurs et un planning inventés.

Preuve : [GitHub Actions Auth #13](https://github.com/torsielloenzo-pixel/nethor/actions/runs/38311583601). Les logs portent les six marqueurs `stage23-*-PASS` et `stage23-local-five-role-planning-complete`.

### Matrice observée côté serveur

| Rôle exact dans Nethor | Rang | Planning lecture | Planning modification | Chat lecture | Chat gestion |
|---|---:|---|---|---|---|
| `admin` | 500 | Autorisé | Autorisé | Autorisé | Autorisé |
| `role_point-de-vente` | 400 | Autorisé | Autorisé | Autorisé | Refusé |
| `responsable` | 300 | Autorisé | Refusé | Autorisé | Refusé |
| `employe` | 200 | Autorisé | Refusé | Autorisé | Refusé |
| `lecture` | 100 | Autorisé | Refusé | Autorisé | Refusé |

Source des permissions de planning et Chat : configuration `site_config.role_permissions` **lue sans modification** sur la base réelle ; matrice recopiée avec des comptes fictifs dans `tests/security/stage23-role-planning-fixture.sql`.

Le code testé comprend une copie des véritables fonctions `private.module_permission`, `private.can_module`, `private.current_role`, `private.role_rank` et des RPC de planning, extraites en lecture seule de Supabase le 12 octobre 2026. Ces copies sont seulement montées dans la stack locale.

**Contrôles effectivement exécutés :**

- Les **cinq utilisateurs fictifs** ouvrent une vraie session Auth et obtiennent un JWT signé.
- Ils retrouvent le **même planning synthétique** par l'API REST et la policy RLS de lecture.
- L'Administrateur enregistre ce planning ; le Point de vente effectue une modification en fournissant la révision attendue.
- Responsable, Employé et Lecture seule reçoivent `status='forbidden'` de la vraie RPC de sauvegarde, et une requête d'écriture directe sur la table est refusée par les permissions/RLS.
- Après désactivation, le JWT du compte Lecture seule ne donne plus accès ni au planning ni aux permissions ; les autres comptes continuent de lire la semaine.
- La matrice de gestion Chat est vérifiée par `private.can_module`. **Le transport, l'envoi de messages et les règles par conversation n'ont pas été testés.**

Scripts : `tests/security/stage23-local-role-planning.cjs`, `stage23-server-helpers.sql`, `stage23-role-probe.sql`, `stage23-role-planning-fixture.sql`, `stage23-role-planning-policy.sql`.

**Incident local corrigé pendant l'étape :** la première exécution a refusé une sauvegarde, car le schéma `private` du banc de test n'avait pas les GRANT nécessaires. Un audit **en lecture seule** a confirmé que la base réelle accorde `USAGE(private)` et `EXECUTE` sur l'implémentation privée aux sessions authentifiées. Le banc local reproduit maintenant ces GRANT précisément. **Ce n'était pas un défaut prouvé du serveur de production**.

## B. Validation visuelle automatique : Chromium uniquement

Preuve : [GitHub Actions — Vues mobile / desktop #1](https://github.com/torsielloenzo-pixel/nethor/actions/runs/38311813150), job **SUCCESS**. Huit marqueurs `stage23-viewport-...-PASS` vérifiés dans les logs.

**Captures d'écran :** artefact GitHub `stage23-chromium-viewport-screenshots` sur cette exécution, huit PNG, conservation pendant sept jours.

Les pages réellement utilisées sont `index.html` (connexion) et `reset-password.html` (récupération), servies depuis `localhost` dans Chromium. L'initialisation Supabase est simulée ; toutes les requêtes vers la production, les services externes et les CDN sont bloquées. Aucun mot de passe ni compte réel n'a été transmis.

| Format simulé | Connexion | Récupération | Contrôles |
|---|---|---|---|
| Mobile 375 × 812 | PASS | PASS | Layout mobile, formulaire visible, aucun débordement horizontal |
| Mobile 390 × 844 | PASS | PASS | Layout mobile, formulaire visible, aucun débordement horizontal |
| Desktop 1 024 × 768 | PASS | PASS | Layout desktop, formulaire visible, aucun débordement horizontal |
| Desktop 1 440 × 900 | PASS | PASS | Layout desktop, formulaire visible, aucun débordement horizontal |

Le formulaire de récupération a été testé avec un jeton **simulé et non utilisable** ; une confirmation de mot de passe différente produit bien le message d'erreur attendu. **Aucun changement de mot de passe réel n'a eu lieu.**

**Limite impérative :** Chromium avec dimensions d'iPhone **n'est pas Safari sur iOS**, et cette suite n'affiche pas le planning après une connexion réelle. Elle ne démontre pas que la PWA est installable ou fonctionne hors connexion sur un iPhone physique. Ne pas utiliser ces captures comme validation complète du produit.

## C. Recette manuelle requise (NON encore exécutée)

Réunir cinq comptes fictifs isolés des utilisateurs du magasin, ouvrir exactement la même semaine du planning et noter la version/révision affichée. Exécuter sur un ordinateur Windows avec navigateur moderne, puis sur un **véritable iPhone Safari**, et enfin dans la PWA installée sur l'écran d'accueil.

| Vérification | Admin | Point de vente | Responsable | Employé | Lecture seule |
|---|---|---|---|---|---|
| Connexion et affichage du rôle correct | À faire | À faire | À faire | À faire | À faire |
| Même semaine, noms, colonnes et horaires, desktop/iPhone | À faire | À faire | À faire | À faire | À faire |
| Dernier import affiché simultanément sur les deux appareils | À faire | À faire | À faire | À faire | À faire |
| Modifier/importer le planning selon le rôle | À faire | À faire | Refus | Refus | Refus |
| Comptes désactivés invisibles dans les vues quotidiennes | À faire | À faire | À faire | À faire | À faire |
| Chat général/direct, avatars, archives et restrictions | À faire | À faire | À faire | À faire | À faire |
| Notifications de modifications, remplacement et lu/non lu | À faire | À faire | À faire | À faire | À faire |
| Déconnexion/révocation en conservant un onglet/PWA déjà ouvert | À faire | À faire | À faire | À faire | À faire |

**Scénarios transversaux à tester :**

1. **Conflit de révision** : deux responsables du planning tentent de modifier une même semaine. Le second doit recevoir une information de conflit, jamais écraser silencieusement la version la plus récente.
2. **PWA hors connexion** : consulter des informations déjà chargées sans réseau ; aucune action d'écriture effective hors-ligne ; indicateur clair. Rétablir le réseau et vérifier les autorisations avant synchronisation.
3. **Rotation / paysage** : interface mobile compréhensible, clavier, boutons, superpositions et menu après changements de taille/orientation.
4. **Réinitialisation e-mail** : lien valide, expiré, déjà utilisé ; mot de passe modifié ; retour à la connexion. Ne pas utiliser de mot de passe de production.
5. **Accessibilité** : navigation clavier sur desktop, cible tactile utilisable, zoom, textes lisibles, lecteurs d'écran sur formulaires critiques.
6. **Performance** : planning actuel, import, Chat et accueil sur appareils réalistes, y compris réseau mobile dégradé ; absence de rechargement en boucle.

Chaque cas manuel exige une **date, un appareil/navigateur, un rôle, un résultat PASS/FAIL, le chemin parcouru et une capture/description**. Aucun cas non exécuté ne peut être coché PASS.

## D. Bloqueurs et décision

- **Bloqueur déjà connu (étape 22) :** le trigger candidat de l'étape 20 constate une modification Auth du mot de passe, mais ne prouve pas qu'un lien e-mail précis a été utilisé. Il ne peut pas être déployé tel quel.
- L'intégration de toutes les Edge Functions, le Chat de bout en bout et la recette des interfaces **après connexion réelle** restent non validés.
- Aucun test sur **iPhone réel** n'a été effectué.
- Aucune migration SQL, donnée personnelle ou session de production n'a été modifiée.

**Étape 23 : validation des permissions serveur cinq rôles et des écrans publics simulés réussie ; recette utilisateur de bout en bout encore ouverte.**

La **PR #40 reste Draft — NO-GO**. Étape 24 : traiter le problème de récupération et les autres défauts prioritaires ; étape 25 : n'envisager la publication qu'après acceptation des tests manuels et approbation explicite.

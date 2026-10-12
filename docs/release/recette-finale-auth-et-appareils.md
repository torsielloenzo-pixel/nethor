# Nethor — Recette finale avant réexamen GO/NO-GO

**Date de préparation :** 13 octobre 2026  
**PR :** #40, branche `refonte-professionnelle-planning-20261012`  
**Décision courante : NO-GO**. La recette est une procédure, pas une preuve d'exécution.

## Séparation des environnements

- **Automatisé :** Supabase Auth local dans GitHub Actions, véritables JWT et jetons de récupération émis par GoTrue, comptes et planning entièrement fictifs. Aucun secret ou compte du magasin, aucun e-mail externe.
- **Non encore testé :** Edge Function complète exécutée dans le runtime Deno avec le service mail, Safari sur un véritable iPhone et PWA installée, interactions authentifiées réelles des cinq rôles.
- Les scripts d'intégration refusent toute URL SQL ou HTTP non locale. Ne jamais les alimenter avec l'adresse ou des clés du projet Supabase hébergé.

## 1. Vérifier la récupération du compte en staging

La nouvelle épreuve automatisée (`tests/security/stage26-local-recovery-integration.cjs`) essaie de valider :
1. `generate_link` Supabase Auth pour la récupération d'un utilisateur fictif ;
2. insertion d'une demande avec seulement le SHA-256 du jeton, jamais le jeton en clair ;
3. refus de clôture avant changement de mot de passe, y compris pour un autre utilisateur ;
4. `verify` GoTrue avec `token_hash`, puis rejet d'une deuxième vérification du même lien ;
5. `PUT /auth/v1/user` avec un JWT de récupération valide et changement réel de mot de passe ;
6. preuve Auth enregistrée par le trigger candidat, mais demande encore ouverte ;
7. vérification de la bonne preuve du lien, résolution unique, refus d'une fausse preuve ou d'une autre identité ;
8. connexion avec nouveau mot de passe, refus de l'ancien ;
9. révocation des droits si le compte est désactivé.

**Attention :** `stage26_finalize_recovery` est une RPC de test locale qui reproduit des prédicats d'accès ; elle **ne remplace pas** le test de la véritable Edge Function `password-recovery-email` exécutée dans Deno. Elle ne vérifie pas l'envoi d'un e-mail par Resend.

### Parcours réel à tester séparément avant GO

Créer un environnement Supabase réellement indépendant avec la fonction Deno candidate et un destinataire e-mail de test. Vérifier :
- demande anonyme, absence de divulgation de l'existence du compte ;
- réception du message avec `request_id` et `token_hash` exacts ;
- lien valide, expiré et déjà utilisé ; réinitialisation Auth et notification unique ;
- changement classique de mot de passe **sans** utiliser le lien ne clôturant pas la demande ;
- sessions désactivées/révoquées, compte supprimé, panne réseau et deux onglets simultanés ;
- quota anti-abus des demandes répétées et journalisation sans identifiants ni jetons sensibles ;
- rollback de la migration et de la fonction, sans suppression des traces d'audit.

**Ne pas utiliser d'identité, numéro, mot de passe ou adresse du magasin dans ces tests.**

## 2. Essais sur appareil physique : matrice à remplir

Se connecter avec les mêmes cinq identités fictives sur un **vrai iPhone dans Safari**, la **PWA installée** et un **ordinateur desktop**, toujours dans l'environnement indépendant.

| Test | Safari iPhone | PWA iPhone | Desktop |
|---|---|---|---|
| Connexion / reconnexion / déconnexion | NON TESTÉ | NON TESTÉ | NON TESTÉ |
| Planning jour, semaine, changements de date | NON TESTÉ | NON TESTÉ | NON TESTÉ |
| Même import, révision et colonnes sur tous les écrans | NON TESTÉ | NON TESTÉ | NON TESTÉ |
| Cinq rôles, visibilité et actions interdites | NON TESTÉ | NON TESTÉ | NON TESTÉ |
| Révocation et désactivation pendant que la vue est ouverte | NON TESTÉ | NON TESTÉ | NON TESTÉ |
| Hors-ligne : lecture seule puis reprise contrôlée | NON TESTÉ | NON TESTÉ | NON TESTÉ |
| Rotation, clavier, écran réduit et taille du texte | NON TESTÉ | NON TESTÉ | NON TESTÉ |
| Chat et notifications, anciens messages archivés | NON TESTÉ | NON TESTÉ | NON TESTÉ |
| Performance, navigation, absence de boucle de rechargement | NON TESTÉ | NON TESTÉ | NON TESTÉ |

Pour chaque ligne : noter **PASS / FAIL / NON TESTÉ**, navigateur et version, rôle, date, captures de test sans données personnelles, révision de la semaine, comportement attendu et comportement observé. Aucun des tests physiques ne doit être marqué PASS à partir d'une capture Chromium simulée.

## 3. Critères fermes du GO

- Dernier commit figé : CI Node/PostgreSQL/Chromium/GoTrue vertes ; les jobs ignorés `skipped` ne sont pas considérés comme des tests réalisés.
- Aucun défaut bloquant sur le parcours Auth, les permissions réelles, les sessions et la PWA.
- Conseils de sécurité Supabase triés, contrôles `SECURITY DEFINER` et Storage vérifiés.
- Sauvegarde et restauration répétées sur staging ; fenêtre d'intervention et surveillance définies.
- **Accord explicite de publication** ; la PR #40 reste brouillon jusqu'à satisfaction des conditions.

**Le plan de 25 étapes est terminé ; cette recette finale est un chantier de validation supplémentaire et ne change pas la décision NO-GO.**

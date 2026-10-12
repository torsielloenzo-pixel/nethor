# Nethor — Étape 25 : décision GO / NO-GO

**Date :** 12 octobre 2026  
**PR :** #40 (Draft), branche `refonte-professionnelle-planning-20261012`  
**Commit audité :** `1cdb294e053a4c75ce5e02f6fd8d32f36ad98b60`  
**DÉCISION : NO-GO — NE PAS FUSIONNER OU PUBLIER.**

## Éléments validés

- GitHub Actions **#1108** : 155 tests Node réussis, zéro échec ; scénarios PostgreSQL stages 17, 18 et 20 réussis.
- Tests des écrans publics **Chromium #13** : succès sur quatre formats simulés.
- Supabase Auth local : scénarios de JWT révoqué et validation des cinq rôles sur un planning synthétique réussis au cours des précédentes exécutions.
- La PR est ouverte et techniquement fusionnable, mais reste en brouillon.
- Production vérifiée en lecture seule : aucune des quatre colonnes du nouveau suivi de récupération, aucun déclencheur Auth candidat ; l'Edge Function de récupération reste en v10. **Aucun correctif proposé n'est actif en production.**
- Aucune branche Supabase de staging hébergé n'existe.

**Précision :** Le workflow Auth #27 est affiché comme réussi, mais son job GoTrue est **ignoré** par filtrage des fichiers. Ce n'est pas une nouvelle validation Auth sur le dernier commit. Les tests Node/SQL vérifient la proposition sans reproduire le parcours Resend/Edge complet.

## Motifs du NO-GO

| Condition de publication | Statut |
|---|---|
| CI du dernier commit | PASS |
| Droits Planning des cinq rôles dans Supabase Auth local | PASS limité au banc synthétique |
| E-mail de récupération réel, lien utilisé, double usage, échec réseau, statut serveur | BLOQUANT : test bout-en-bout absent |
| Trigger sur `auth.users` et Edge Function associés testés ensemble dans Supabase staging | BLOQUANT : test absent |
| Safari sur iPhone et PWA installée : planning, offline, reconnexion et logout | BLOQUANT : test physique absent |
| Même planning sur ordinateur/iPhone avec cinq rôles via interfaces complètes | BLOQUANT : test absent |
| Edge Functions Admin/Chat/notifications, RLS/Storage, autres RPC | PARTIEL |
| Sauvegarde et rollback répétés sur staging | BLOQUANT : non exécutés |
| Approbation explicite de publication | BLOQUANT : non accordée |

## Avis de sécurité Supabase du 12 octobre 2026

- **39** avis concernant des fonctions `SECURITY DEFINER` accessibles au rôle authentifié. Leur exécution peut être intentionnelle ; audit des contrôles internes nécessaire. [Documentation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- **1** avis concernant la fonction publique `get_public_login_config`. Elle doit rester publique si nécessaire au login, sans exposer de secrets. [Documentation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- **1** avis : protection des mots de passe compromis désactivée. [Documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **3** informations sur des tables dont la RLS n'a pas de politique et **2** avis sur des politiques permissives multiples. Vérifier leur caractère intentionnel avant toute modification.

Ce sont des **avis de configuration**, pas la preuve d'une vulnérabilité exploitée. Aucune politique de production n'a été changée.

## Critères pour une nouvelle décision GO

1. Staging Supabase isolé (et accord si ressource facturable) avec le dernier SQL proposé et la dernière Edge Function candidate : récupération réelle complète avec une adresse de test, et vérification d'un changement Auth **sans lien**.
2. Vérifier les cinq rôles sur Windows et sur un **vrai iPhone Safari/PWA**, la même semaine de planning, un import, les actions interdites, le chat, les notifications, le hors-ligne et la révocation.
3. Traiter/justifier les avis de sécurité et tester les chemins d'authentification et de privilèges sensibles.
4. Répéter la sauvegarde, le retour arrière et les contrôles après publication dans un environnement indépendant. Comparer la version de chaque fonction en production juste avant la publication.
5. Rejouer les trois suites CI sur un commit candidat immuable, documenter les résultats, puis obtenir un **GO explicite**.

Si un point bloquant persiste, la publication est refusée. Les 25 étapes du plan sont terminées en tant que **revues et préparations**, pas comme garantie que le site est prêt à déployer.

**Aucune fusion, aucune migration, aucun déploiement, aucun compte ou planning de production modifié lors de cette étape.**

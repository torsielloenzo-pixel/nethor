# Nethor — Étape 22 : validation Supabase Auth indépendante

**Date :** 12 octobre 2026. **PR :** #40, branche `refonte-professionnelle-planning-20261012`.  
**Production :** non modifiée. **GO/NO-GO :** NO-GO tant que la validation d'intégration et les essais appareil restent incomplets.

## Objectif et isolement

Aucune branche Supabase n'existait dans le projet hébergé au lancement de l'étape 22. L'approche choisie est une **stack Supabase locale jetable dans GitHub Actions** (GoTrue/Auth, PostgREST, PostgreSQL). Elle peut émettre de vrais JWT et gérer réellement `auth.sessions`, sans posséder les utilisateurs, tables ou secrets de production.

Le workflow est `.github/workflows/nethor-auth-staging.yml`.

Les mesures de confinement sont explicites :
- Un projet Supabase local est initialisé sous `$RUNNER_TEMP/nethor-auth-stage22`, **sans lien** au projet hébergé.
- Pas de `supabase link`, `supabase db push` ni de clé de production ; seules les clés créées localement par le CLI sont utilisées.
- Avant toute commande SQL, le workflow exige `API_URL` et `DB_URL` vers `127.0.0.1` ou `localhost`.
- Le client Node vérifie lui aussi `STAGE22_LOCAL_AUTH=1` et interdit toute adresse externe ; il ne journalise ni jeton ni mot de passe.
- Les deux comptes et leurs adresses `example.test` sont créés à la volée, puis supprimés avec la stack locale.
- L'exécution n'utilise aucun destinataire Resend, aucun compte du magasin, aucune URL publique Nethor.
- Démarrage restreint aux composants Auth, base PostgreSQL, API REST et passerelle, dans la limite des capacités de GitHub Actions.

Supabase recommande son [CLI de développement local](https://supabase.com/docs/guides/local-development/cli/getting-started) avec Docker ; ce test n'entraîne pas la création d'une branche ou d'un projet Supabase hébergé potentiellement facturable. Il utilise toutefois des minutes et des ressources GitHub Actions, suivant les conditions du dépôt.

## Couverture proposée

1. Initialiser une base Supabase locale avec un schéma fictif (`tests/security/stage22-local-auth-schema.sql`).
2. Installer une copie en lecture seule de la vraie fonction Nethor `private.session_is_active()`.
3. Compiler les fonctions candidates `private.list_team_members_impl()` et `public.my_subrole_keys()` depuis le fichier SQL proposé à l'étape 16, sans modifier la version de production.
4. Exposer **uniquement localement** un petit RPC `stage22_auth_probe()` autorisé au rôle `authenticated`.
5. Créer deux vrais utilisateurs Auth synthétiques : Employé et Admin, puis se connecter par mot de passe pour recevoir des JWT signés par le GoTrue local.
6. Appeler le RPC avec le jeton valide, puis simuler une désactivation, une révocation par date et la suppression de l'entrée `auth.sessions`, tout en réutilisant l'ancien JWT encore signé.
7. Vérifier les refus côté RPC quand le compte ou la session n'est plus autorisé et vérifier que la session Admin indépendante demeure active.
8. Créer une demande de récupération fictive et modifier le mot de passe par le **vrai endpoint Supabase Auth** `PUT /auth/v1/user`, afin de vérifier que le trigger candidat étape 20 observe la modification d'empreinte.

Code de validation : `tests/security/stage22-local-auth-integration.cjs`.

## Portée et limites

Il s'agit d'une validation du **vrai moteur Auth local et de quelques RPC ciblés**, contrairement aux tests PostgreSQL précédents qui simulaient `auth.jwt()` et `auth.uid()`. Les comptes, leurs noms, les profils et les données sont toujours fictifs.

Ce banc ne reproduit **pas** l'ensemble des policies RLS, des 12 fonctions SQL, des 11 Edge Functions ou de l'interface publiée. Il n'implique pas que les permissions des cinq rôles ont été validées en production.

**Risques à traiter avant GO :**
- Le trigger proposé sur `auth.users.encrypted_password` se déclenche pour tout changement de mot de passe, y compris potentiellement un changement administrateur ; il prouve la modification d'empreinte, pas l'utilisation d'un lien e-mail déterminé.
- Les privilèges GoTrue réels, le comportement des sessions après `auth.updateUser` et les éventuelles mises à jour Auth externes doivent être testés.
- Les vrais rôles métiers, le parcours de récupération de bout en bout, les Edge Functions et les navigateurs/PWA restent dans la suite du plan.
- Tout SQL affectant `auth.users` est encore une **proposition**, à faire réviser avant une éventuelle migration.

## Statut des validations et sortie

Les résultats doivent être fondés sur les logs du workflow **Nethor — Auth Supabase isolée (étape 22)**, pas sur les tests des étapes précédentes.

Aucune autorisation de déploiement n'est donnée par une CI verte ; la PR #40 reste en **Draft**, et la sortie reste **NO-GO**.

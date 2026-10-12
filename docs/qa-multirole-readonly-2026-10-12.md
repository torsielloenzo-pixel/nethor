# Nethor — QA multi-rôles et publication (lecture seule)

Date : 12 octobre 2026. Projet Supabase : `gioxrpaiwogqqtakjpnv`. Branche GitHub : `refonte-professionnelle-planning-20261012`, PR #40.

> **Portée** : contrôles SQL de métadonnées, revue de code et tests automatisés. Aucun compte n'a été utilisé pour ouvrir une session utilisateur. Aucun essai réel sur iPhone ou desktop n'a été effectué. Ce document ne constitue **pas** une autorisation de mise en production.

## 1. Contrôles SQL réellement exécutés

Requêtes exécutées exclusivement en lecture seule dans Supabase :

- `information_schema.columns` pour identifier les champs de `planning_weeks`, `planning_import_history`, `profiles`, `app_settings` et `subrole_module_permissions`.
- Comptages agrégés des comptes actifs/désactivés, groupés par rôle, sans extraction des identités.
- Comparaison du dernier `planning_import_history.file_name` au `planning_weeks.source_file` pour les semaines du 5 et du 12 octobre.
- Nombre d'entrées de `employee_order` pour chacune de ces semaines.
- Lecture des niveaux de permission `planning`, `portal_admin` et `articles` de `site_config`.
- Vérification du drapeau RLS des tables du schéma public, sans prétendre vérifier toutes les politiques.
- Consultations des advisories Supabase (lecture seule).

| Vérification | Résultat observé | Verdict |
|---|---|---|
| Projet | ACTIVE_HEALTHY | Information |
| Comptes actifs : admin / Point de vente / responsable / employé | 1 / 1 / 2 / 10 | Inventaire confirmé |
| Comptes désactivés | 1 employé | Cas à tester sans le réactiver |
| Comptes Lecture seule | Aucun actuellement | Parcours authentifié non réalisable sans compte de test |
| Semaine 2026-10-05 | Source et dernier import : `PLANNING 05.10.26 SEMAINE B.xls` | Correspondance confirmée |
| Semaine 2026-10-12 | Source et dernier import : `PLANNING 12.10.26 SEMAINE C.xls` | Correspondance confirmée |
| Employee order | 14 entrées dans chacune des semaines | Confirmé |
| Planning | admin et Point de vente = manage ; autres rôles = view | Configuration confirmée |
| Gestion | admin = manage ; autres rôles = none | Configuration confirmée |
| Articles | admin = manage ; autres rôles = none | Configuration confirmée |
| Permissions de sous-rôles | Aucune entrée `subrole_module_permissions` | État courant confirmé |
| Tables publiques avec RLS activée | Oui pour toutes les tables ordinaires recensées | Activation RLS seulement, pas audit d'accès complet |

## 2. Correctif découvert lors de la revue de la branche

L'écran Planning applique déjà un filtrage des identités désactivées, mais l'Accueil mobile ne le faisait pas systématiquement.

Correction isolée sur la branche :

- correspondance des employés du planning aux champs `planning_name` et `display_name` ;
- exclusion des comptes `account_enabled=false` dans l'équipe présente et les affectations d'après-midi ;
- exclusion des comptes désactivés des destinataires affichés et des compteurs des tâches ;
- test de non-régression avec des comptes **fictifs** uniquement, dans `tests/mobile-home-active-team.test.cjs` ;
- version de l'asset `home-view.js` incrémentée ; Service Worker et manifeste synchronisés (version 455).

Ce test ne remplace pas le contrôle réel de l'affichage sur un iPhone et un ordinateur.

## 3. Alertes de sécurité suivies séparément

Les advisories Supabase constatent :

- 3 tables avec RLS activée sans policy : à examiner selon leur usage ;
- 1 fonction publique `SECURITY DEFINER` accessible au rôle anonyme, `get_public_login_config()` ;
- 39 fonctions `SECURITY DEFINER` accessibles au rôle authentifié.

Ces observations **ne prouvent pas** une exploitation possible ; chacune nécessite un examen du code de la fonction et de ses contrôles d'autorisation. Aucun droit ou schéma Supabase n'a été changé pendant cette étape.

Références : [RLS sans policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [SECURITY DEFINER anonyme](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [SECURITY DEFINER authentifié](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## 4. Validation fonctionnelle restant ouverte — NO-GO

- [ ] Connexion réelle Admin puis tentative de désactivation/révocation d'un compte **de test** ; vérification des deux sessions.
- [ ] Connexion Point de vente : Planning utilisable en gestion ; refus serveur Gestion.
- [ ] Connexion Responsable, Employé et Lecture seule : vérifier visibilité et refus des mutations interdites (aucun compte Lecture seule actuellement).
- [ ] Ouvrir le même planning publié sur desktop et iPhone/PWA et comparer personne par personne les horaires et la révision.
- [ ] Vérifier la suppression des comptes désactivés dans les vues opérationnelles mobile et desktop.
- [ ] Installer/ouvrir la PWA iOS, tester réseau coupé, réseau rétabli, arrière-plan et sessions révoquées.
- [ ] Contrôler les états vides, les thèmes, les petites largeurs, le chat et les retours de navigation.

**Décision : NO-GO / PR en Draft.** Les tests automatiques, même réussis, ne doivent pas être présentés comme des tests sur des appareils physiques.

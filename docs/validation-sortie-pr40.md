# Nethor — Porte de sortie préproduction (PR #40)

Date de préparation : 2026-10-12. Ce document n'atteste **aucun test manuel réussi**. Il définit les preuves à recueillir avant d'autoriser la fusion.

## État de référence
- Branche : `refonte-professionnelle-planning-20261012` → `main`.
- Dernière exécution connue avant ce document : GitHub Actions « Nethor — Tests de fiabilité », run #1009, **success** (commit `3d7184455974c5a3879d57f216013de927ce76f1`).
- PR actuellement en Draft. Ne pas basculer en « Ready » ni déployer sur la base des tests automatisés uniquement.
- Les permissions serveur (RLS/RPC) sont la source de vérité. Aucun test ne doit demander d'abaisser les droits en production.

## Journal d'exécution — à renseigner avec des preuves

Pour chaque cas, renseigner : date/heure, environnement (navigateur, appareil, PWA installée ou non), rôle, identifiant de **compte de test non sensible**, résultat PASS/FAIL/BLOQUÉ, capture ou identifiant de log et ticket associé. Ne jamais consigner de mot de passe, jeton, cookie, code de réinitialisation ou donnée personnelle inutile.

| ID | Priorité | Scénario et résultat attendu | Résultat |
|---|---|---|---|
| SEC-01 | P0 | Admin désactive un compte de test connecté sur deux appareils : toute mutation ultérieure est refusée sur les deux appareils, le retour réseau/focus ne restaure pas la session ; archives conservées. | À exécuter |
| SEC-02 | P0 | Abaisser un rôle pendant l'édition Planning : mode édition fermé, brouillon non publiable, opérations serveur refusées. | À exécuter |
| SEC-03 | P0 | Point de vente : Planning = manage et Gestion = none conformément à la configuration active ; accès direct par URL à Gestion refusé par le serveur. | À exécuter |
| SEC-04 | P0 | Employé et Lecture seule : tentative d'appel d'une RPC de mutation non autorisée refusée (pas uniquement un bouton caché). | À exécuter |
| PLN-01 | P0 | Importer une semaine de test contenant toutes les colonnes : même semaine, même dernière révision, mêmes personnes et mêmes créneaux sur mobile/PWA et desktop. | À exécuter |
| PLN-02 | P0 | Deux éditeurs modifient la même semaine : le second ne peut pas écraser silencieusement la révision publiée ; message de conflit intelligible. | À exécuter |
| PLN-03 | P1 | Remplacer le planning : statut « Lu » réinitialisé conformément à la règle en vigueur ; un compte désactivé est absent des vues actives. | À exécuter |
| NAV-01 | P0 | Mobile iPhone : Accueil ↔ Planning ↔ Chat ↔ Outils ; Équipe et Promotions s'ouvrent, bouton Retour fonctionne sans boucle. | À exécuter |
| NAV-02 | P1 | Desktop : sidebar étendue/réduite, fenêtre 1024 px, thèmes clair/sombre ; aucun débordement ni boucle de rechargement. | À exécuter |
| PWA-01 | P0 | iPhone PWA installée : ouverture froide, arrière-plan, perte/retour réseau ; pas de cache affiché comme publication courante à tort. | À exécuter |
| CHAT-01 | P1 | Envoi double (Entrée rapide) : un seul message ; Général et conversations directes non archivables ; anciennes conversations intactes. | À exécuter |
| ABS-01 | P1 | Double clic de demande d'absence : une seule demande ; validations concurrentes ne créent pas deux décisions. | À exécuter |
| DATA-01 | P0 | Après tous les essais : aucune suppression de planning réel, message, historique, compte ou préférence ; RLS et schéma inchangés. | À exécuter |

## Conditions absolues de GO / NO-GO
- **NO-GO** si au moins un P0 échoue, est bloqué, ou manque de preuve.
- **NO-GO** si un rôle peut exécuter une action interdite côté serveur, si mobile/desktop divergent sur le planning publié ou si l'authentification boucle.
- **NO-GO** si la dernière CI du commit candidat échoue ou n'a pas été exécutée.
- **NO-GO** si une migration non auditée, une modification de schéma ou une modification RLS apparaît dans les changements.
- **GO** seulement lorsque tous les P0 sont PASS, tous les P1 sont PASS ou font l'objet d'une décision de risque explicite, et que la personne responsable valide la fusion.

## Feuille de décision
- Commit candidat :
- Dernier run CI (lien, conclusion) :
- Appareils / navigateurs testés :
- P0 : __ / 8 PASS (recalculer selon la table), P1 : __ / 5 PASS (recalculer selon la table)
- Anomalies ouvertes :
- Validation finale (date et responsable) :
- Décision : **NON VALIDÉE** (par défaut)

## Retour arrière
1. Conserver le SHA de `main` juste avant la fusion.
2. Vérifier que la mise en production n'introduit aucune migration irréversible.
3. En cas de régression P0, interrompre les mutations à risque et revenir à la version précédente par la procédure de déploiement du projet ; ne pas réécrire l'historique `main` sans procédure explicite.
4. Vérifier ensuite les caches PWA/service worker ainsi que les sessions actives avant réouverture.

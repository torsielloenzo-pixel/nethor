# QA préproduction — Refonte professionnelle Nethor

Branche : `refonte-professionnelle-planning-20261012`
PR : #40

## Objectif
Valider que la refonte reste un changement d'expérience et de structure visuelle, sans régression sur les données, permissions, imports, historiques ou règles métier.

## Couverture automatisée
Le test `tests/professional-refactor-qa.test.cjs` vérifie notamment :
- présence des écrans principaux ;
- versions du shell desktop ;
- présence des couches de refonte professionnelle ;
- migration de l'ancien raccourci Équipe ;
- contrats des routes administratives ;
- permissions dynamiques via `role_permissions` et sous-rôles ;
- portée Mobile du Scanner et du Signalement ;
- contexte de diagnostic des signalements ;
- cohérence des assets PWA avec le Service Worker ;
- absence des principales versions obsolètes ;
- protections responsive et états système communs.

## Matrice fonctionnelle à valider avant fusion

| Module | Administrateur | Point de vente* | Responsable | Employé | Lecture seule | Mobile | Desktop |
|---|---|---|---|---|---|---|---|
| Accueil | ✓ | selon permissions | ✓ | ✓ | ✓ | ✓ | ✓ |
| Planning personnel | ✓ | selon permissions | ✓ | ✓ | lecture | ✓ | ✓ |
| Planning équipe | ✓ | selon permissions | selon permissions | selon permissions | lecture | ✓ | ✓ |
| Couverture / Analyse | ✓ | selon permissions | selon permissions | selon permissions | lecture/masqué | ✓ | ✓ |
| Équipe | ✓ | selon permissions | ✓ | ✓ | ✓ | ✓ | ✓ |
| Congés / indisponibilités | gérer | selon permissions | selon permissions | demander/voir | lecture | ✓ | ✓ |
| Chat | ✓ | selon permissions | ✓ | ✓ | selon permissions | ✓ | ✓ |
| Promotions | gérer | gérer | lecture validée | lecture validée | lecture validée | ✓ | ✓ |
| Fiches articles | gérer | aucun accès actuel | aucun accès actuel | aucun accès actuel | aucun compte actuel | selon droits | ✓ |
| Scanner | ✓ | selon permissions | ✓ | ✓ | selon permissions | ✓ | — |
| Signalement | ✓ | selon permissions | ✓ | ✓ | ✓ | ✓ | accès shell |
| Notifications | ✓ | selon permissions | ✓ | ✓ | ✓ | ✓ | ✓ |
| Profil / sécurité | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Personnalisation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gestion | gérer | aucun accès actuel | aucun accès actuel | aucun accès actuel | aucun compte actuel | ✓ si autorisé | ✓ si autorisé |

* Le rôle « Point de vente » et les sous-rôles peuvent être définis dynamiquement dans `site_config`. La QA ne doit jamais remplacer cette logique par une liste codée en dur.

## Snapshot backend réel

Voir aussi : `docs/qa-backend-production-2026-10-12.md`.

La configuration de production auditée confirme notamment que Point de vente gère le Planning mais n'accède pas à Gestion, que Fiches articles est actuellement réservé à l'Administrateur et que Promotions est géré par Admin/Point de vente avec lecture filtrée pour les autres rôles.

## Parcours de test par rôle

### Administrateur
1. Connexion puis Accueil.
2. Navigation vers Planning, Équipe, Promotions, Chat et Gestion.
3. Import d'un planning de test puis vérification mobile/desktop.
4. Modification d'une semaine et contrôle du reset de lecture.
5. Création / activation / désactivation d'un compte de test.
6. Vérification que le compte désactivé disparaît des vues actives sans perte d'archives.
7. Validation/refus d'une demande d'absence.
8. Vérification des logs, notifications et signalements.

### Point de vente
1. Vérifier les modules exposés par `role_permissions` et les sous-rôles.
2. Confirmer qu'aucun bouton interdit n'est seulement masqué côté UI : l'appel serveur doit aussi être refusé.
3. Vérifier Planning, Couverture, Équipe, Congés et Promotions selon la configuration du magasin.
4. Vérifier que « Faire une demande » reste masqué lorsque la règle métier le prévoit.

### Responsable
1. Planning équipe et couverture.
2. Congés selon le niveau de permission.
3. Chat / Équipe.
4. Fiches articles et outils terrain.
5. Absence d'accès Gestion sauf permission explicite.

### Employé
1. Accueil et prochaine prise de poste.
2. Planning personnel.
3. Demande de congé / indisponibilité.
4. Chat, Équipe et notifications.
5. Fiches articles / scanner selon permission.
6. Absence de contrôles administratifs.

### Lecture seule
1. Toutes les vues autorisées doivent rester non modifiables.
2. Aucun import, validation, modification compte ou sauvegarde métier.
3. Navigation et consultation fonctionnelles.

## Parcours multi-plateforme

### Desktop
- largeur standard ;
- fenêtre réduite autour de 1024 px ;
- sidebar complète puis compacte ;
- mode clair / sombre ;
- aucun chevauchement horizontal ;
- planning avec toutes les colonnes présentes dans l'import.

### Mobile / PWA iOS
- ouverture froide ;
- retour depuis arrière-plan ;
- mode clair / sombre ;
- planning Semaine / Jour ;
- Chat ;
- Scanner ;
- Notifications ;
- Profil / Paramètres ;
- mode hors connexion en consultation ;
- retour en ligne sans affichage de données obsolètes comme données vérifiées.

## Données et non-régression
- le dernier planning publié est identique sur mobile et desktop ;
- aucun compte désactivé dans les vues opérationnelles ;
- archives Chat conservées ;
- aucune perte de notification ou d'historique ;
- RLS inchangées ;
- Service Worker synchronisé ;
- aucune donnée fictive ajoutée dans les KPI ou l'Équipe.

## Critères de sortie de préproduction
La PR peut sortir du mode Draft seulement si :
1. tous les tests GitHub Actions sont verts ;
2. les parcours Admin / Responsable / Employé / Lecture seule sont validés ;
3. un compte Point de vente réel ou de test valide les permissions dynamiques ;
4. Planning desktop et mobile montrent strictement la même publication ;
5. aucun bug bloquant de navigation, PWA ou authentification n'est constaté ;
6. le retour arrière vers `main` reste possible sans migration destructive.

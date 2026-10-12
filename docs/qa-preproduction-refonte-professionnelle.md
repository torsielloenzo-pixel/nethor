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

## Anomalies détectées pendant la QA

### Promotions mobile non atteignable depuis Outils — corrigé
La page Promotions existait et respectait déjà les droits serveur, mais elle n'était pas déclarée dans le registre commun des modules ni reconnue comme page native par le shell mobile.

Correction appliquée :
- ajout de Promotions à `profile-ui.js` ;
- ajout au menu mobile Outils/Plus ;
- ajout d'une icône dédiée ;
- prise en charge par `ui/mobile/mobile-shell.js` ;
- versions PWA / Service Worker synchronisées ;
- test de non-régression ajouté.

Les droits ne changent pas : la lecture reste disponible selon RLS, tandis que l'import et la revue restent réservés à Admin / Point de vente.

Validation : GitHub Actions **#877 — succès**.

### Retours mobiles Équipe / Promotions — corrigé
Ces deux pages standalone déclaraient qu'elles géraient leur retour mais n'affichaient aucun bouton visible sur mobile.

Correction appliquée :
- bouton Retour visible sur Équipe ;
- bouton Retour visible sur Promotions ;
- utilisation de `NethorNavigation.navigateBack()` ;
- fallback vers `user-menu.html` ;
- test de non-régression ajouté.

### Fiches articles absent de la sidebar principale — corrigé
Le module existait mais n'était pas présent dans la navigation desktop cible.

Correction appliquée :
- ajout de Fiches articles à la sidebar principale ;
- entrée masquée dès le premier rendu ;
- visibilité calculée via `permissionLevel('articles')` ;
- sidebar entière rendue permission-aware pour Accueil, Planning, Équipe, Promotions, Articles, Chat, Gestion, Signalement et Paramètres.

Avec la configuration actuelle de production, Fiches articles reste visible uniquement pour l'Administrateur.

### Promotions non configurable dans Gestion > Sidebar — corrigé
La sidebar runtime connaissait Promotions, mais l'éditeur de configuration Admin ne l'exposait pas.

Correction appliquée :
- ajout de Promotions aux valeurs par défaut de la sidebar dans `admin-portal-runtime.js` ;
- gestion du label, de l'activation et de l'URL comme les autres entrées ;
- test de non-régression ajouté.

Validation : GitHub Actions **#929 — succès**.

## QA des actions internes par rôle

### Congés — Point de vente
Le backend attribue `manage` à Point de vente pour les absences, mais une demande personnelle est réservée au niveau `request` et à l'Administrateur.

Correction :
- le bouton « Faire une demande » utilise maintenant la même condition que l'action réelle ;
- Point de vente ne voit plus une action qui serait refusée ;
- ouverture et soumission utilisent le même garde-fou `canRequestPlanningAbsence()`.

### Promotions — mobile standalone
Une redirection historique renvoyait tout mobile depuis `promotions.html` vers `mobile.html`, ce qui pouvait ramener à l'Accueil après ouverture depuis Outils.

Correction :
- suppression de cette redirection ;
- Promotions reste une page outil standalone sous le shell mobile ;
- le parent SPA est mémorisé par le routeur pour un retour cohérent.

### Fiches articles
Les mutations produits/catégories/conditionnements sont protégées par `articles=manage`, tandis que les familles restent Admin-only côté RLS.

Correction :
- actions générales affichées selon `permissionLevel('articles') === 'manage'` ;
- gestion des familles toujours masquée et bloquée pour tout non-Admin ;
- comportement actuel inchangé en production puisque Articles est aujourd'hui Admin-only.

### Chat
- Général reste permanent et non archivable ;
- les discussions directes restent visibles et ne sont pas archivables ;
- seuls les groupes exposent désormais l'action Archiver sur desktop ;
- l'épinglage et la photo du canal Général restent strictement Admin ;
- un futur rôle avec `chat=manage` peut effectuer la suppression douce autorisée par RLS ;
- seule la suppression définitive via `chat_admin_delete_message` reste Admin-only.

### Tâches du jour
Correspondance UI / RLS confirmée :
- Admin / Point de vente : éditeur ;
- Responsable / Employé : utilisateur, validation de ses propres tâches ;
- Lecture seule : masqué.

### Comptes, Signalements, Notifications et Profil
Contrôles confirmés :
- Gestion des comptes : Admin-only avant chargement du runtime ;
- traitement des signalements : Admin-only ;
- règles globales de notifications : Admin-only ;
- notifications personnelles : opérations limitées au `user_id` courant ;
- préférences Profil/Paramètres : mise à jour du profil courant uniquement.

Validation automatisée : **Nethor — Tests de fiabilité #948 : succès**.

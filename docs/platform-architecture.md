# Architecture de plateforme Nethor

## Objectif

Nethor partage une seule base de données, une seule authentification et les mêmes règles métier entre les interfaces, mais distingue explicitement trois contextes d'affichage :

- `desktop`
- `mobile`
- `mobile-preview`

La largeur de la fenêtre ne décide plus à elle seule de l'interface active.

## Source de vérité

`platform-resolver.js` est chargé avant `profile-ui.js`.

Il inscrit sur `<html>` :

- `data-nethor-platform="desktop"`
- `data-nethor-platform="mobile"`
- `data-nethor-platform="mobile-preview"`

Il expose aussi `window.NethorPlatform`.

Exemples :

```js
NethorPlatform.current()
NethorPlatform.isDesktop()
NethorPlatform.isMobile()
NethorPlatform.isPreview()
NethorPlatform.describe()
```

## Règle obligatoire

Ne jamais créer une fonctionnalité avec une condition de ce type :

```js
window.innerWidth <= 900
matchMedia('(max-width:900px)')
```

pour décider si Nethor est en mode mobile ou desktop.

Utiliser :

```js
window.NethorPlatform?.isMobile()
window.NethorPlatform?.isDesktop()
```

Les media queries de largeur restent autorisées pour ajuster la mise en page **à l'intérieur de la plateforme déjà choisie**, mais elles ne doivent plus sélectionner la plateforme.

## Résolution automatique

Ordre actuel :

1. `mobile_preview=1` -> `mobile-preview`
2. paramètre explicite `nethor_platform=desktop|mobile`
3. préférence locale forcée
4. valeur déjà résolue pour la session
5. détection de l'appareil (UA mobile, iOS/iPadOS, Android, pointeur tactile + taille physique)
6. défaut -> `desktop`

Le résultat automatique est mémorisé dans `sessionStorage`, donc un simple redimensionnement de fenêtre ne change pas de plateforme.

## Isolation desktop

Sur `desktop`, le résolveur neutralise les media queries mobiles basées sur :

- `max-width <= 900px`
- `pointer: coarse`
- `hover: none`

Ainsi, réduire une fenêtre de navigateur sur PC ne transforme plus Nethor en interface mobile.

Les règles desktop intermédiaires au-dessus de 900 px restent disponibles.

## Vision mobile

La Vision mobile utilise `mobile-preview`.

Elle ne dépend pas du redimensionnement du navigateur desktop et doit rester un environnement explicite.

## Navigation

La navigation doit rester séparée par plateforme.

Exemple :

```text
Desktop
Mon profil -> Retour -> Accueil

Mobile
Menu utilisateur -> Mon profil -> Retour -> Menu utilisateur
```

Une nouvelle page doit déclarer son parent logique pour chaque plateforme si les comportements diffèrent.

## Données

Aucune séparation de données n'est nécessaire.

Desktop et mobile continuent à partager :

- Supabase
- comptes
- rôles et sous-rôles
- planning
- stock
- articles
- notifications
- chat
- journaux
- configuration

La séparation concerne uniquement l'interface et la navigation.

## QA minimale

Tester chaque modification d'interface sur :

- Desktop normal
- Desktop avec fenêtre réduite sous 900 px : doit rester Desktop
- iPhone portrait
- iPhone paysage
- Android portrait/paysage
- Vision mobile depuis Desktop

Toute régression où un redimensionnement desktop active une fonction mobile doit être considérée comme un bug de plateforme.

## Navigation par plateforme

`platform-navigation.js` est la source de vérité pour les parents de pages.

Il contient deux cartes distinctes :

- `DESKTOP_ROUTES`
- `MOBILE_ROUTES`

Le shell global ne doit plus maintenir sa propre table de retour.

Exemple :

```text
profile.html
Desktop -> home.html
Mobile  -> user-menu
```

Les pages autonomes doivent appeler `window.NethorNavigation.backTarget()` ou les helpers dédiés au Menu utilisateur au lieu d'utiliser `history.back()`, `document.referrer` ou une détection par largeur.

La Vision mobile conserve `mobile-preview` dans les URL de navigation pour rester dans le même shell pendant tout le parcours.


## Phase 3 — shells physiques

Les composants d'interface spécifiques sont maintenant séparés physiquement :

```text
ui/
├── desktop/
│   ├── desktop-shell.js
│   └── desktop-shell.css
└── mobile/
    ├── mobile-shell.js
    └── mobile-shell.css
```

### Responsabilités

`ui/desktop/desktop-shell.js`
- construit les composants spécifiques Desktop du shell global ;
- actuellement : menu utilisateur Desktop.

`ui/mobile/mobile-shell.js`
- construit les composants spécifiques Mobile ;
- actuellement : barre de navigation basse et Menu utilisateur Mobile.

`ui/desktop/desktop-shell.css`
- contient les styles de présentation spécifiques Desktop ;
- contient notamment l'échelle et les adaptations Desktop historiques extraites du noyau commun.

`ui/mobile/mobile-shell.css`
- contient les styles de navigation et Menu utilisateur Mobile.

`profile-ui.js`
- reste le noyau commun ;
- fournit données, permissions, notifications, thèmes, événements et appels communs ;
- délègue le rendu des composants spécifiques aux shells.

### Règle de maintenance obligatoire

Ne pas ajouter une correction Mobile directement dans le shell Desktop ou dans une règle globale si elle ne concerne que Mobile.

Ne pas ajouter une correction Desktop dans le shell Mobile.

Ordre de choix :

1. comportement commun aux deux plateformes -> noyau commun ;
2. rendu/composant Desktop -> `ui/desktop/` ;
3. rendu/composant Mobile -> `ui/mobile/` ;
4. hiérarchie de navigation -> `platform-navigation.js` ;
5. détection de plateforme -> `platform-resolver.js`.

Une modification dans `ui/mobile/` ne doit jamais modifier le comportement Desktop sans une modification explicite d'un fichier commun.


### Activation des stylesheets de shell

Les deux stylesheets sont référencés avec `media="not all"` et `data-nethor-shell`.

`platform-resolver.js` active ensuite uniquement le stylesheet correspondant à la plateforme résolue :

- Desktop -> `ui/desktop/desktop-shell.css`
- Mobile / Mobile Preview -> `ui/mobile/mobile-shell.css`

Le stylesheet de l'autre plateforme reste désactivé. Une règle Desktop ne peut donc pas s'appliquer sur Mobile simplement parce qu'un écran est large, et inversement.


## Phase 4.1 — structures de page par plateforme

La séparation ne concerne plus seulement les styles et composants du shell : elle commence désormais au niveau du HTML réellement monté.

### Résolveur de structure

`platform-page-layout.js` choisit le constructeur de page du shell déjà résolu :

- Desktop -> `NethorDesktopShell.buildPageLayout()`
- Mobile / Vision mobile -> `NethorMobileShell.buildPageLayout()`

Il ne consulte ni `innerWidth` ni une media query pour choisir la plateforme.

### Pages migrées

Première vague :

- `home.html`
- `profile.html`
- `planning.html`

Ces pages ne contiennent plus leur ancien en-tête hybride. Elles exposent seulement des points de montage neutres :

```html
<div data-nethor-platform-header></div>
<div data-nethor-platform-lead></div>
```

Le shell actif remplace ces points par **sa propre structure**. La structure du shell opposé n'est donc pas présente dans le DOM.

### Profil Mobile

`profile.html` possède désormais une zone haute Mobile produite par le shell Mobile, avec son propre bouton Retour vers le Menu utilisateur. Le hero Desktop n'est pas utilisé pour construire cette vue.

Le header Mobile restant dans le DOM est uniquement un hôte technique invisible pour les outils globaux (notifications/menu utilisateur) avant leur portage dans le shell Mobile.

### Planning et Accueil

Pour cette première étape, le contenu métier de Planning et Accueil reste partagé. Seul leur chrome de page est séparé.

La suite de la phase 4 consiste à extraire progressivement les groupes de mise en page propres à chaque plateforme — sans dupliquer les données, permissions, appels Supabase ni logique métier.


## Phase 4.2 — Planning physiquement séparé

Le Planning ne partage plus ses blocs supérieurs entre Desktop et Mobile.

### Fichiers dédiés

```text
ui/
├── desktop/
│   ├── planning-layout.js
│   └── planning-layout.css
└── mobile/
    ├── planning-layout.js
    └── planning-layout.css
```

Ces modules construisent uniquement la structure de leur plateforme.

### Points de montage neutres

`planning.html` conserve les données et blocs métier communs mais remplace les anciens composants hybrides par des points de montage :

- `data-nethor-planning-top`
- `data-nethor-planning-toolbar`
- `data-nethor-planning-source-actions`
- `data-nethor-planning-mobile-actions`
- `data-nethor-planning-mobile-schedule`

`platform-page-layout.js` v2 monte ensuite exclusivement le layout Desktop ou Mobile déjà choisi par `platform-resolver.js`.

### Desktop

La structure Desktop contient notamment :

- Vue Semaine / Année ;
- navigation de semaine ;
- sélecteur de jours Desktop ;
- état de sauvegarde ;
- import Excel et modification dans les actions Desktop.

Elle ne contient plus :

- `mobilePlanningActionsDock` ;
- `mobileSchedule` ;
- les groupes de navigation Mobile.

### Mobile

La structure Mobile contient notamment :

- Semaine / Calendrier avec indication iOS / Android / Mobile ;
- navigation semaine ;
- sélecteur de jours Mobile ;
- dock Import / Modifier ;
- `mobileSchedule`.

Elle ne contient plus les groupes `desktopPlanningViewGroup` et `desktopPlanningDayGroup`.

### Fin de la sélection par largeur

Les comportements suivants utilisent maintenant la plateforme résolue et non la largeur :

- placement logique des actions ;
- affichage simplifié Mobile pour les deep-links repos/congés ;
- disponibilité du mode Couverture Desktop ;
- choix Mobile/Desktop de l’Agenda.

Un redimensionnement Desktop ne peut donc plus faire basculer ces fonctions vers leur logique Mobile.

La logique métier reste commune : Supabase, permissions, imports Excel, données horaires, anomalies, couverture, congés, logs et calculs ne sont pas dupliqués.


## Phase 4.3 — mise en page interne du Planning

La séparation de plateforme descend maintenant au niveau de la présentation interne.

### CSS inline réduit

Les blocs historiques suivants ont quitté `planning.html` :

- `planningMobilePolish` -> `ui/mobile/planning-layout.css`
- `planning-desktop-menu-v1` -> `ui/desktop/planning-layout.css`
- `planning-desktop-full-day-v1` -> `ui/desktop/planning-layout.css`
- `planning-reader-actions-row-v1` -> `ui/desktop/planning-layout.css`
- `planning-layout-refactor-v2` -> `ui/desktop/planning-layout.css`

Le bloc imbriqué invalide `planning-empty-actions-fix-v1` a été normalisé en CSS valide.

Les media queries historiques Mobile jusqu’à 900 px ont également été extraites du CSS commun vers la couche Mobile. Les adaptations génériques Desktop/tablette à 1180/1350 px restent partagées lorsqu’elles ne représentent pas un changement de plateforme.

### Agenda en trois couches

`planning-agenda-v2.css` v15 contient uniquement la base commune.

Les variantes sont désormais séparées :

```text
ui/desktop/planning-agenda.css
ui/mobile/planning-agenda.css
```

Le résolveur de plateforme n’active que la feuille correspondante.

### DOM Agenda propre à la plateforme

`planning-agenda-v2.js` v18 ne crée plus une structure hybride.

Desktop construit :

- la bascule Classique / Agenda ;
- l’en-tête Agenda Desktop ;
- les statistiques Agenda ;
- le contenu Agenda.

Mobile construit :

- Jour / Semaine / Calendrier ;
- le sélecteur de date/semaine ;
- l’en-tête Agenda Mobile ;
- le contenu Agenda.

Ainsi, les contrôles Mobile ne sont plus présents puis masqués sur Desktop, et inversement.

### Invariants conservés

Aucune duplication de logique métier :

- mêmes données Supabase ;
- mêmes imports Excel ;
- mêmes permissions ;
- mêmes calculs horaires ;
- mêmes congés / indisponibilités ;
- mêmes anomalies et couverture ;
- mêmes fonctions de rendu de données.


## Phase 4.4 — Accueil physiquement séparé

L’Accueil n’utilise plus une structure commune remodelée en Mobile par des media queries.

### Fichiers dédiés

```text
ui/
├── desktop/
│   ├── home-layout.js
│   └── home-layout.css
└── mobile/
    ├── home-layout.js
    └── home-layout.css
```

`platform-page-layout.js` v3 monte uniquement la structure correspondant à la plateforme déjà résolue.

### Point de montage commun

`home.html` expose maintenant seulement :

```html
<div data-nethor-home-layout></div>
```

Aucune structure Accueil Desktop ou Mobile n’est présente avant le montage du shell actif.

### Structure Desktop

Desktop construit uniquement :

- le bandeau Bonjour ;
- le message de planning du jour ;
- le tableau de bord opérationnel Desktop ;
- les cartes des outils autorisés ;
- le statut de session ;
- la fenêtre de statistiques de consultations pour l’administration.

La fenêtre de statistiques n’est plus présente dans le DOM Mobile.

### Structure Mobile

Mobile construit uniquement :

- le tableau de bord applicatif ;
- le hero de bienvenue Mobile lorsque le widget est autorisé ;
- les blocs opérationnels ;
- les accès rapides Mobile lorsque le widget est autorisé.

Il ne construit plus :

- le bandeau Bonjour Desktop ;
- `homePages` ;
- les cartes Desktop ;
- le statut Desktop ;
- la fenêtre de statistiques de consultations.

### Fin de la détection par largeur

L’ancien helper basé sur :

```js
matchMedia('(max-width:700px)')
```

a été supprimé.

Le moteur utilise désormais exclusivement `NethorPlatform.current()`.

Réduire une fenêtre Desktop ne transforme donc plus la structure Accueil en structure Mobile.

### CSS

Les anciens blocs `mobile-home-dashboard-v137` et `desktop-home-dashboard-v157` ont quitté `home.html` et sont intégrés à leurs feuilles de plateforme.

Les couches historiques Mobile de l’ancien Accueil à cartes ont été supprimées puisqu’elles ne correspondent plus à une structure montée sur Mobile.

Le cœur du composant Passation reste partagé ; seules ses adaptations strictement Mobile ont été transférées à la feuille Mobile.

### DOM généré selon la plateforme

Le rendu des widgets ne crée plus certains éléments des deux plateformes pour ensuite les masquer :

- le hero `welcome` est créé uniquement sur Mobile ;
- les accès rapides sont créés uniquement sur Mobile ;
- le titre Équipe est généré directement dans sa version Desktop ou Mobile.

Les données restent communes : Supabase, permissions, widgets, tâches, planning, équipe, notifications et préférences utilisateur ne sont pas dupliqués.


## Phase 4.5 — Profil et Menu utilisateur

La séparation de plateforme couvre maintenant `profile.html` ainsi que le point de montage des outils globaux et du Menu utilisateur.

### Profil : structures dédiées

```text
ui/
├── desktop/
│   ├── profile-layout.js
│   └── profile-layout.css
└── mobile/
    ├── profile-layout.js
    └── profile-layout.css
```

`profile.html` expose uniquement :

```html
<div data-nethor-profile-layout></div>
```

`platform-page-layout.js` v4 construit ensuite uniquement le Profil de la plateforme résolue.

Desktop conserve son hero `Mon profil` et ses cartes de compte.

Mobile ne reçoit pas le hero Desktop : il utilise sa zone haute Mobile produite par le shell, puis sa propre structure de contenu.

Les IDs fonctionnels restent identiques dans la structure active afin de conserver la même logique métier : avatar, nom, couleur, thème, récompenses, sons, mot de passe et notifications.

### Fin de la sélection Profil par largeur

L’ancien code :

```js
const MOBILE_PROFILE_QUERY = window.matchMedia('(max-width:700px)')
```

est supprimé.

Le mode Profil utilise désormais exclusivement `NethorPlatform.current()`.

Les adaptations Mobile à 600/700 px ont quitté le CSS commun de `profile.html` pour rejoindre `ui/mobile/profile-layout.css`.

Les anciens styles du menu `nMenu` Mobile présents dans le Profil ont été supprimés : le Menu utilisateur est maintenant celui du shell Mobile.

### Menu utilisateur

Les builders restent physiquement séparés :

- `NethorDesktopShell.buildUserMenu()`
- `NethorMobileShell.buildUserMenu()`

`profile-ui.js` ne construit que le menu du shell actif.

### Suppression du faux header Mobile

Le shell Mobile n’utilise plus :

```html
<header class="nethorMobileUtilityHost">
  <div class="top"></div>
</header>
```

Il fournit maintenant un hôte technique neutre :

```html
<div data-nethor-global-tools-host></div>
```

Le shell Desktop expose lui aussi `data-nethor-global-tools-host` dans sa barre supérieure.

`profile-ui.js` monte les notifications, mises à jour et menu utilisateur dans cet hôte explicite, avec fallback vers les anciens headers pour les pages qui ne sont pas encore migrées.

### Navigation Retour

Lorsqu’un layout déclare `data-nethor-page-back-handled="1"`, `profile-ui.js` n’injecte plus un second bouton Retour.

Ainsi :

- Profil Mobile garde son retour vers le Menu utilisateur ;
- Profil Desktop garde son retour Desktop ;
- Planning Desktop garde le bouton du shell ;
- aucune version opposée n’écrase la navigation active.

### Invariants

La séparation ne duplique pas :

- Supabase/Auth ;
- données du profil ;
- rôles et permissions ;
- stockage avatar ;
- récompenses ;
- logique mot de passe ;
- notifications ;
- préférences de thème.


## Phase 4.6 — Réglages et pages enfants du Menu utilisateur

La séparation Desktop / Mobile s’étend aux pages ouvertes depuis le Menu utilisateur :

- `settings.html` — Personnalisation ;
- `notification-settings.html` — Réglages des notifications ;
- `report-problem.html` — Signaler un problème.

### Builders dédiés par plateforme

```text
ui/
├── desktop/
│   ├── user-pages-layout.js
│   └── user-pages-layout.css
└── mobile/
    ├── user-pages-layout.js
    ├── user-pages-layout.css
    ├── settings-page.css
    └── notification-settings-page.css
```

Les trois pages utilisent un point de montage neutre :

```html
<div data-nethor-user-page-layout></div>
```

`platform-page-layout.js` v5 appelle uniquement le builder correspondant à la plateforme résolue.

### Personnalisation

Desktop construit son hero `Mon portail`, son badge de rôle et ses panneaux de configuration.

Mobile construit sa propre zone haute avec retour vers le Menu utilisateur, un badge de rôle compact et les mêmes panneaux fonctionnels.

L’ancien `settingsMobileTop` n’est plus présent dans le HTML commun et les règles Mobile historiques de `settings-mobile-layout-v142` sont chargées uniquement sur Mobile.

Le breakpoint historique à 620 px a également quitté le CSS commun.

### Réglages des notifications

Desktop dispose maintenant d’une introduction Desktop et d’une largeur de travail dédiée.

Mobile conserve son en-tête compact avec retour Menu utilisateur.

Le DOM commun ne contient plus simultanément `nsTop` et les cartes de réglages.

Les adaptations petits écrans sont isolées dans `ui/mobile/notification-settings-page.css`.

### Signaler un problème

Le moteur de signalement n’est pas dupliqué :

- même session Supabase ;
- même collecte de diagnostic ;
- même payload ;
- même validation et envoi ;
- mêmes routes de retour.

Seule la structure d’interface change.

Desktop construit une page centrée avec titre et bouton Annuler dans une barre Desktop, un formulaire plus large et un défilement normal.

Mobile conserve une vue plein écran compacte, avec safe areas et comportement tactile.

Les mesures de `window.innerWidth`, du pointeur et du viewport restent présentes uniquement dans le diagnostic envoyé avec un signalement : elles ne servent pas à choisir la plateforme.

### Navigation

Les shells Desktop et Mobile reconnaissent maintenant :

- `settings` ;
- `notification-settings` ;
- `report-problem`.

Personnalisation et Réglages des notifications déclarent leur navigation Retour comme gérée par leur propre structure, ce qui empêche tout bouton Retour concurrent injecté par la couche globale.

### Isolation CSS

Les règles historiques de Settings et Notifications ont été séparées en feuilles propres à chaque page afin qu’aucune règle générique comme `main` ou `.panel` ne puisse affecter le formulaire de signalement.

La logique métier reste partagée et inchangée.


## Phase 4.7 — Notifications et Scanner

La séparation structurelle couvre maintenant le centre de notifications et le Scanner.

### Fichiers de plateforme

```text
ui/
├── desktop/
│   ├── tool-pages-layout.js
│   └── tool-pages-layout.css
└── mobile/
    ├── tool-pages-layout.js
    └── tool-pages-layout.css
```

`platform-page-layout.js` v6 monte ces pages via `data-nethor-tool-page-layout`.

### Notifications

Avant la phase 4.7, `notifications.html` contenait un header Desktop et un seul DOM. Une media query :

```css
@media(max-width:900px),(pointer:coarse)
```

cachait le header et transformait la présentation en Mobile.

Ce mécanisme est supprimé.

Desktop et Mobile construisent maintenant leurs propres wrappers de page. Le moteur de notifications reste commun : chargement, filtres, recherche, marquage lu/non lu, suppression et navigation vers la cible ne sont pas dupliqués.

Les anciennes règles Mobile à 900 px et 380 px ont quitté le CSS commun pour la feuille Mobile.

### Scanner

Le Scanner possédait auparavant un DOM unique contenant simultanément :

- caméra ;
- lecteur HTML5 QR / EAN ;
- recherche manuelle ;
- message `Scanner est réservé au mobile`.

Une règle `@media(min-width:901px)` masquait ensuite la caméra sur Desktop.

Cette logique est remplacée par deux structures physiques.

Desktop construit uniquement :

- son titre Scanner ;
- son retour ;
- le message indiquant que la lecture caméra est réservée à Mobile.

Desktop ne possède plus dans son DOM :

- `reader` ;
- `cameraStateText` ;
- `cameraFallback` ;
- `eanInput` ;
- `result`.

Mobile construit uniquement l’interface Scanner opérationnelle : caméra, overlay, préférence caméra, recherche EAN et résultat.

Le moteur conserve `NethorPlatform.isMobile()` comme source de vérité. Un redimensionnement Desktop ne peut donc pas initialiser la caméra.

Le chargement des préférences caméra est également évité entièrement sur Desktop.

### CSS

Le breakpoint `max-width:900px` du Scanner a été déplacé vers la feuille Mobile.

Le breakpoint `min-width:901px` qui servait uniquement à masquer le Scanner sur Desktop a été supprimé, puisque la structure Desktop ne contient plus les éléments caméra à cacher.

### Prochaines pages identifiées

L’audit de 4.7 a identifié notamment :

- `articles.html` : plusieurs couches Mobile historiques ;
- `accounts.html` : logique responsive complexe ;
- `admin-portal.html` : grand nombre de media queries de structure ;
- `fl-assistant.html` : une couche responsive plus simple.

Ces pages seront traitées séparément pour conserver un périmètre de validation maîtrisable.


## Phase 4.8 — Fiches articles

La page `articles.html` rejoint l’architecture Desktop / Mobile séparée.

### Structures dédiées

```text
ui/
├── desktop/
│   ├── articles-layout.js
│   └── articles-layout.css
└── mobile/
    ├── articles-layout.js
    └── articles-layout.css
```

Le HTML commun expose uniquement :

```html
<div data-nethor-articles-layout></div>
```

`platform-page-layout.js` v7 monte ensuite uniquement le layout actif.

### Suppression de l’ancienne navigation locale

`articles.html` contenait encore son propre système de navigation historique :

- `nMenu` ;
- `nMenuWrap` ;
- `mobileNavBackdrop` ;
- bouton Personnalisation `settingsLink` ;
- logique `toggleMenu()` ;
- listeners globaux du menu.

Cette couche est supprimée.

La page utilise désormais les shells Nethor comme les autres pages migrées.

### Desktop

Desktop construit :

- le hero `Référentiel articles` ;
- le compteur de fiches ;
- les outils administrateur ;
- recherche et filtres ;
- la grille d’articles.

Le shell Desktop fournit l’en-tête `Fiches articles / Référentiel produit interne` et son bouton Retour.

### Mobile

Mobile construit :

- un top compact propre à Fiches articles ;
- un bouton Retour utilisant `NethorNavigation` ;
- le compteur ;
- les outils administrateur ;
- recherche et filtres ;
- la grille d’articles.

Le hero Desktop n’est pas créé sur Mobile.

### CSS

Les anciens breakpoints sont sortis du CSS commun.

- `max-width:900px` est conservé comme adaptation interne de la grille Desktop, mais uniquement dans la feuille Desktop ;
- `650px`, `390px` et `520px` appartiennent maintenant uniquement à la feuille Mobile ;
- le breakpoint `700px` consacré à l’ancien overlay `nMenu` est supprimé.

La largeur d’une fenêtre ne choisit donc plus la plateforme.

### Moteur métier conservé

Aucune duplication de logique pour :

- Supabase ;
- permissions `articles` ;
- chargement du référentiel ;
- familles / catégories / conditionnements ;
- recherche ;
- filtres Actif / Inactif ;
- création et modification ;
- photos ;
- statut produit ;
- dialogues ;
- deep-link `?ean=` depuis le Scanner ;
- liens vers Stock F&L et Boulangerie.

Les mêmes IDs fonctionnels sont présents dans le layout actif sur les deux plateformes.


## Phase 4.9 — Gestion des comptes

`accounts.html` rejoint l’architecture de plateforme séparée tout en conservant son intégration dans Gestion.

### Trois contextes, deux plateformes

La page possède maintenant :

```text
ui/
├── desktop/
│   ├── accounts-layout.js
│   └── accounts-layout.css
├── mobile/
│   ├── accounts-layout.js
│   └── accounts-layout.css
└── accounts-embedded.css
```

Desktop et Mobile ont leurs propres structures pleine page.

Le mode `?embedded=1`, utilisé dans Gestion, reste un contexte spécial indépendant de la plateforme : il réutilise le même contenu fonctionnel, sans hero ni shell externe.

### Point de montage

Le HTML commun ne contient plus directement le header ou le `main` de Gestion des comptes.

Il expose :

```html
<div data-nethor-accounts-layout></div>
```

`platform-page-layout.js` v8 choisit ensuite le builder actif.

### Desktop

Desktop construit :

- le hero `Comptes & activité` ;
- les actions Actualiser / Créer un compte ;
- les statistiques ;
- les onglets Comptes / Rôles & permissions / Journal ;
- la liste utilisateurs et la fiche détaillée ;
- les matrices de rôles, widgets et sous-rôles ;
- le journal d’activité.

Le shell Desktop fournit l’en-tête de page et le retour vers Gestion.

### Mobile

Mobile ne construit pas le hero Desktop.

Il possède :

- un top compact ;
- un retour utilisant `NethorNavigation` ;
- les actions d’administration ;
- les statistiques ;
- les trois onglets ;
- les mêmes vues fonctionnelles.

Les adaptations à 600 et 700 px sont désormais confinées à `ui/mobile/accounts-layout.css`.

### Mode embarqué Gestion

Quand `embedded=1` est présent :

- aucun header Desktop n’est construit ;
- aucun chrome Mobile n’est construit ;
- aucun bouton Retour global n’est injecté ;
- le hero pleine page n’est pas construit ;
- le contenu fonctionnel commence directement par les statistiques / onglets ;
- `nav=external` continue de permettre au parent de piloter la navigation des onglets.

Le responsive interne à 900 px de l’iframe est conservé dans `ui/accounts-embedded.css`. Il adapte uniquement la largeur du contenu embarqué et ne sert pas à choisir Desktop ou Mobile.

### Fin de `innerWidth` comme décision Mobile

L’ancien comportement :

```js
if (scroll && innerWidth < 900) ...
```

est remplacé par :

```js
NethorPlatform.isMobile()
```

Réduire une fenêtre Desktop ne déclenche donc plus un comportement Mobile.

### Moteur métier inchangé

La phase ne duplique pas :

- authentification Supabase ;
- contrôle du rôle administrateur ;
- création / modification / suppression de comptes ;
- demandes de réinitialisation de mot de passe ;
- rôles personnalisés ;
- permissions par module ;
- widgets Planning ;
- widgets Accueil ;
- sous-rôles ;
- journal et statistiques de visites ;
- sélection d’utilisateur par query string ;
- communication iframe vers Gestion.

Les mêmes IDs fonctionnels sont présents dans les layouts Desktop, Mobile et embarqué.

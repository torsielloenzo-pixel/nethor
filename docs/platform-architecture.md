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

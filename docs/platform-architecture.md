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

# Migration Mobile — document unique

## Objectif

Faire évoluer Nethor Mobile vers un seul document `mobile.html` qui conserve un shell permanent et monte les différentes vues dans `#mobile-view`, sans transformer Desktop en SPA et sans dupliquer les services communs.

## Phase 1 — Conteneur mobile isolé

La phase 1 est volontairement non destructive.

### Fichiers

```text
mobile.html
ui/mobile/mobile-app.css
ui/mobile/mobile-app.js
```

### Structure

```text
mobile.html
├── en-tête du shell
├── #mobile-view
└── #mobile-nav
```

`platform-resolver.js` reste la source de vérité. `mobile.html` accepte uniquement les plateformes `mobile` et `mobile-preview`. Si le document est ouvert avec une plateforme `desktop`, il revient vers `home.html`.

Le nouveau runtime expose `window.NethorMobileApp` avec les hôtes stables du shell, la plateforme résolue, la vue demandée et le helper de compatibilité vers les anciennes URLs. Il émet l'événement `nethor:mobile-app-ready` après initialisation.

### Compatibilité

Aucune page existante n'est redirigée vers `mobile.html` pendant cette phase.

Les utilisateurs continuent d'utiliser les documents historiques. La navigation visible dans le nouveau shell possède des liens de secours vers :

- `home.html`
- `planning.html`
- `chat.html`
- `notifications.html`
- `user-menu.html`

En `mobile-preview`, le paramètre `mobile_preview=1` est conservé.

### Cache

Le Service Worker précache le nouveau document et ses ressources dédiées. `mobile.html` est traité comme une navigation stricte afin que sa structure soit récupérée en priorité depuis le réseau lorsque celui-ci est disponible.

## Phase 2 — Routeur interne

La phase 2 introduit `ui/mobile/mobile-router.js`.

### Responsabilités

`MobileRouter` gère désormais :

- `history.pushState()` pour les vues migrées ;
- `history.replaceState()` pour l'état initial et les remplacements ;
- `popstate` pour Retour / Avant du navigateur ;
- les deep-links `mobile.html?view=...` ;
- le montage `mount()` et démontage `unmount()` des futures vues ;
- le retour en haut lorsqu'un onglet déjà actif est sélectionné ;
- le fallback automatique vers les pages HTML historiques lorsqu'une vue n'est pas encore migrée.

### Source de vérité navigation

Les correspondances entre identifiants de vues Mobile et anciennes pages HTML sont centralisées dans `platform-navigation.js` via :

- `mobileViewTarget(view)` ;
- `mobileViewTable()`.

Le routeur ne maintient donc pas sa propre table concurrente de destinations.

### Mode hybride

Tant qu'une vue n'est pas enregistrée :

```text
MobileRouter.open("planning")
        ↓
vue Planning non migrée
        ↓
planning.html
```

Lorsqu'une vue sera enregistrée :

```text
MobileRouter.open("planning")
        ↓
history.pushState()
        ↓
PlanningView.mount(#mobile-view)
```

Ainsi la migration peut se faire page par page.

### Deep-links

Un lien de type :

```text
mobile.html?view=planning
```

est reconnu par le routeur. Si Planning n'est pas encore migré, il ouvre `planning.html`. Une fois la vue migrée, ce même lien restera dans `mobile.html` et montera la vue correspondante.

Les paramètres `mobile_preview=1` et `nethor_platform=mobile` restent conservés. Les autres paramètres de requête sont transmis au fallback historique lorsqu'ils sont pertinents.

### Historique

Deux vues migrées successives restent dans le même document et utilisent l'historique navigateur. Retour / Avant déclenchent `popstate` et remontent la vue précédente/suivante sans recharger le document.

Un second appui sur l'onglet déjà actif ne crée pas une nouvelle entrée d'historique.

### Sécurité de migration

La phase 2 ne redirige toujours pas les anciennes pages Mobile vers `mobile.html`. Le système actuel reste donc utilisable pendant la migration.

## Prochaine phase

La phase 3 pourra charger les services communs du shell Mobile une seule fois (session, profil, permissions, configuration et services partagés), sans encore migrer tout le contenu métier.

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

## Prochaine phase

La phase 2 introduira `MobileRouter` dans le shell, avec `history.pushState()`, `popstate`, gestion des deep-links et fallback vers `platform-navigation.js`. Aucune vue métier ne doit être migrée avant que ce routeur soit stable.

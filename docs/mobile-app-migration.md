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

## Phase 3 — Services communs persistants

La phase 3 introduit `ui/mobile/mobile-services.js`.

### Principe

Le shell Mobile charge désormais une seule instance Supabase pendant toute la durée de vie de `mobile.html`.

Les futures vues ne devront plus recréer à chaque ouverture :

- le client Supabase ;
- la session Auth ;
- le profil utilisateur ;
- `app_settings.site_config` ;
- les permissions issues de `my_subrole_permissions` ;
- les clés de sous-rôles ;
- les préférences de notifications ;
- la liste et le compteur de notifications.

### API

Le service est exposé via :

```js
window.NethorMobileServices
window.MobileServices
```

Les principaux points d'accès sont :

```js
await NethorMobileServices.ready()
NethorMobileServices.snapshot()
NethorMobileServices.client
NethorMobileServices.session
NethorMobileServices.profile
NethorMobileServices.siteConfig
NethorMobileServices.subrolePermissions
NethorMobileServices.notifications
NethorMobileServices.unread
```

Les vues peuvent aussi s'abonner aux changements sans recréer de connexion :

```js
const unsubscribe = NethorMobileServices.subscribe(state => {
  // mettre à jour la vue
})
```

### Données chargées

L'initialisation commune reprend les mêmes sources déjà utilisées par Nethor :

- `profiles` ;
- `app_settings` avec la clé `site_config` ;
- RPC `my_subrole_permissions` ;
- RPC `my_subrole_keys` ;
- RPC `my_notification_channel_preferences` avec fallback vers `my_notification_preferences` ;
- table `planning_notifications`.

L'avatar est signé une fois depuis `profile-avatars` lors du chargement du profil.

### Temps réel

Le shell conserve des abonnements persistants pour :

- le profil courant ;
- la configuration globale ;
- les notifications du compte ;
- les sous-rôles et permissions ;
- les préférences et règles de notifications.

Ces événements actualisent le service partagé au lieu de réinitialiser toute l'application.

### Compatibilité événements

Pour faciliter la migration des composants existants, le service republie également les événements historiques :

- `netto:profile` ;
- `netto:notifications`.

Ils portent la marque `mobileServices: true`.

### Notifications

Le compteur non lu de la barre Mobile est désormais piloté par `MobileServices.unread`.

Il reste actif tant que le document Mobile reste ouvert et se met à jour lors des changements reçus en temps réel.

### Authentification

Si aucune session n'est disponible, `mobile.html` renvoie vers `index.html`.

Les paramètres de plateforme utiles sont conservés pour :

- `mobile-preview` ;
- `nethor_platform=mobile`.

Un changement Auth `SIGNED_OUT` nettoie les canaux persistants avant le retour vers la connexion.

### Garantie d'instance unique

`start()` est idempotent.

Plusieurs appels à :

```js
NethorMobileServices.start()
```

réutilisent la même promesse d'initialisation et le même client Supabase.

Un test simulé de phase 3 vérifie qu'après deux `start()` et un `refresh()` :

- un seul client Supabase a été créé ;
- un seul listener Auth a été installé ;
- les canaux temps réel restent attachés au même client ;
- les données communes sont réutilisées.

### Sécurité de migration

Les pages HTML historiques restent autonomes pendant cette phase. Elles continuent d'utiliser leur propre runtime lorsqu'elles sont ouvertes par le fallback du routeur.

Le partage persistant s'applique uniquement aux futures vues montées dans `mobile.html`.

## Prochaine phase

La phase 4 pourra migrer **Accueil** en première vraie vue `mount()/unmount()` utilisant directement `NethorMobileServices`, sans recréer session, profil ou permissions.

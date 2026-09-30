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

## Phase 4 — Accueil devient une vraie vue

La phase 4 migre Accueil dans le document Mobile unique.

### Fichiers

```text
ui/mobile/views/home/
├── home-view.js
└── home-view.css
```

`HomeView` est enregistré auprès de `MobileRouter` sous l'identifiant `home`.

À l'ouverture de :

```text
mobile.html
```

le routeur normalise maintenant l'URL vers :

```text
mobile.html?view=home
```

puis monte réellement Accueil dans :

```text
#mobile-view
```

sans changer de document.

### Cycle de vie

La vue expose :

```js
HomeView.mount(host)
HomeView.unmount()
```

`mount()` :

- attend `NethorMobileServices.ready()` ;
- réutilise le client Supabase déjà ouvert par le shell ;
- charge uniquement les données métier nécessaires à Accueil ;
- attache les abonnements temps réel propres à Accueil ;
- monte le widget Pilotage magasin si l'utilisateur y a accès.

`unmount()` :

- annule les abonnements propres à Accueil ;
- retire les listeners DOM ;
- démonte le widget Pilotage magasin ;
- libère le contenu de la vue ;
- ne détruit pas la session, le profil ni le client Supabase partagé.

### Données réutilisées depuis le shell

Accueil ne recrée plus :

- la session ;
- le profil ;
- `site_config` ;
- les permissions de sous-rôles ;
- la liste globale des notifications.

Ces données proviennent directement de `NethorMobileServices`.

Accueil charge uniquement ses données spécifiques :

- semaines de planning ;
- équipe ;
- catalogue et tâches de passation ;
- affectations et validations des tâches ;
- données du widget Pilotage magasin.

### Fonctions Accueil conservées

La nouvelle vue conserve les blocs Mobile déjà présents :

- bienvenue ;
- prochaine prise de poste ;
- heures de la semaine ;
- congés ;
- prochain repos ;
- passation matin → après-midi ;
- informations importantes ;
- équipe du jour ;
- accès rapides ;
- widget Pilotage magasin.

Les actions de passation restent disponibles pour les rôles concernés :

- préparer/publier les missions ;
- sélectionner l'équipe d'après-midi ;
- ajouter une mission ponctuelle ;
- valider une tâche ;
- supprimer ou réinitialiser la passation selon les droits existants.

### Navigation interne

Les boutons d'Accueil ne font plus directement dépendre l'application de `location.href`.

La vue traduit l'ancienne URL vers l'identifiant Mobile correspondant, puis appelle `MobileRouter.open()`.

Exemple :

```text
Accueil
  ↓
Planning du 02/10
  ↓
MobileRouter.open("planning", {
  week: ...,
  day: ...
})
```

Comme Planning n'est pas encore migré, le routeur utilise actuellement :

```text
planning.html?week=...&day=...
```

sans perdre les paramètres.

Une fois Planning migré, le même appel restera dans `mobile.html`.

### Correction du routeur

Le fallback du routeur conserve désormais les paramètres de vue lors de la transition vers une page historique.

Cette correction est nécessaire pour :

- les semaines et jours du Planning ;
- les focus congés/repos ;
- les futurs deep-links de Chat et autres outils.

### Stock F&L

La table de navigation Mobile contient maintenant aussi :

```text
stock → index.html
```

ce qui permet aux accès rapides d'Accueil d'utiliser le même mécanisme hybride que les autres pages.

### Pilotage magasin

`operations-widget.js` expose désormais également :

```js
NethorOperationsWidget.unmount()
```

afin de nettoyer son DOM et ses états lorsqu'Accueil est démonté.

### Compatibilité

`home.html` reste disponible.

Il n'est pas encore redirigé automatiquement vers `mobile.html`, ce qui garde un chemin de secours pendant la migration.

Desktop continue d'utiliser `home.html` et son architecture existante.

## Phase 5 — Menu utilisateur et Notifications

La phase 5 ajoute deux nouvelles vues à `mobile.html` :

```text
ui/mobile/views/
├── notifications/
│   ├── notifications-view.js
│   └── notifications-view.css
└── user-menu/
    ├── user-menu-view.js
    └── user-menu-view.css
```

Les vues sont enregistrées sous :

```text
notifications
user-menu
```

### Menu utilisateur

Le Menu utilisateur n'ouvre plus `user-menu.html` lorsqu'il est utilisé depuis le nouveau shell.

Il est maintenant monté dans `#mobile-view` et réutilise :

- profil ;
- rôle ;
- avatar ;
- `site_config` ;
- sous-rôles et permissions ;
- préférences personnelles.

La structure existante est conservée :

- Mon profil ;
- Personnalisation ;
- Accueil ;
- Stock F&L ;
- Planning ;
- Chat ;
- Scanner ;
- Fiches articles ;
- Réglages des notifications ;
- pages administratives autorisées ;
- autres raccourcis configurés ;
- thème clair/sombre ;
- Mise à jour ;
- Signaler un problème ;
- Déconnexion.

Le rendu réutilise le constructeur `NethorMobileShell.buildUserMenu()` déjà présent dans Nethor.

### Droits et visibilité

La vue respecte :

- `pages[id].enabled` ;
- `pages[id].roles` ;
- `role_permissions` ;
- les permissions de sous-rôle ;
- `pages[id].user_menu` ;
- `mobile_user_menu.items` ;
- `ui_preferences.user_menu`.

Desktop n'est pas concerné par cette logique.

### Thème

Le changement de thème est maintenant fourni par `NethorMobileServices.setThemePreference()`.

Il :

- applique immédiatement le thème au document Mobile ;
- met à jour le cache local ;
- met à jour `profiles.ui_preferences.theme` ;
- conserve la même session Supabase.

### Mise à jour

Le Menu utilise maintenant `NethorMobileServices.checkForUpdates()`.

La vérification compare :

- la version publiée dans `app-version.json` ;
- la version réelle du Service Worker actif.

Lorsqu'une version supérieure existe, Nethor peut demander l'installation puis déclencher la purge des anciens caches et l'activation du nouveau Service Worker.

### Déconnexion

La déconnexion appelle directement le service partagé :

```js
NethorMobileServices.signOut()
```

Le shell n'ouvre donc pas un second client Auth pour cette action.

### Signaler un problème

Le paramètre historique :

```text
from=user-menu.html
```

est conservé pour identifier correctement la page concernée.

Le fallback du routeur mémorise simultanément le parent SPA :

```text
mobile.html?view=user-menu
```

afin que le retour Mobile puisse retrouver le Menu après la future migration de cette sous-vue.

### Notifications

`NotificationsView` conserve les fonctions de la page actuelle :

- liste des notifications ;
- priorité visuelle des non lues ;
- regroupement Nouveau / Aujourd'hui / Hier / Cette semaine / Plus anciennes ;
- recherche ;
- filtre Toutes / Non lues ;
- menu d'options ;
- marquer une notification comme lue ;
- tout marquer comme lu ;
- ouvrir la destination ;
- supprimer une notification ;
- supprimer toutes les notifications.

### Source de données Notifications

La vue n'interroge pas Supabase pour son initialisation.

Elle consomme directement :

```js
NethorMobileServices.notifications
NethorMobileServices.unread
```

et s'abonne au service partagé.

Les changements temps réel reçus par le shell mettent donc à jour à la fois :

- le badge de la barre Mobile ;
- la liste ouverte dans Notifications.

### Actions Notifications partagées

`MobileServices` expose désormais :

```js
markNotificationRead(id)
markAllNotificationsRead()
deleteNotification(id)
deleteAllNotifications()
```

Les modifications restent liées au compte courant et rafraîchissent l'état partagé.

### Navigation depuis une notification

Une notification qui cible une vue déjà migrée reste dans le même document.

Exemple :

```text
Notifications
   ↓
Accueil
   ↓
MobileRouter.open("home")
```

Une destination non migrée utilise encore le fallback HTML avec conservation de ses paramètres.

### Cycle de vie

Les deux vues retirent leurs listeners et abonnements locaux lors de `unmount()`.

Elles ne détruisent jamais :

- la session ;
- le client Supabase ;
- les canaux temps réel globaux de `MobileServices`.

### Compatibilité

`user-menu.html` et `notifications.html` restent disponibles comme pages de secours.

Aucune redirection forcée de ces anciennes URLs vers la SPA n'est encore activée.

## Phase 6 — Sous-vues du Menu utilisateur

La phase 6 migre dans `mobile.html` :

```text
profile
settings
notification-settings
report-problem
```

### Mon profil

`ProfileView` réutilise directement `NethorMobileServices`.

Fonctions conservées :

- identité et rôle ;
- couleur du profil ;
- thème clair/sombre ;
- photo de profil ;
- recadrage avant envoi ;
- suppression de la photo ;
- changement de mot de passe avec vérification du mot de passe actuel ;
- personnalisation avancée administrateur via le catalogue de récompenses ;
- sons d'interface lorsque `NettoSounds` est disponible ;
- accès au centre Notifications.

La photo utilise toujours le bucket `profile-avatars`.

Le remplacement de photo :

```text
recadrage
   ↓
upload nouveau fichier
   ↓
profiles.avatar_path
   ↓
suppression ancien fichier
```

est maintenant porté par le client Supabase partagé.

### Personnalisation

`SettingsView` conserve :

- choix clair/sombre ;
- visibilité des menus de l'accueil ;
- visibilité des widgets de l'accueil ;
- visibilité des raccourcis du Menu utilisateur ;
- Tout afficher / Tout masquer ;
- Réinitialiser ;
- Enregistrer.

Les préférences restent stockées dans :

```text
profiles.ui_preferences
├── home
├── home_widgets
├── user_menu
└── theme
```

Les droits continuent à tenir compte de :

- rôle ;
- sous-rôles ;
- `site_config.pages` ;
- `role_permissions` ;
- `mobile_user_menu.items` ;
- configuration des widgets.

### Réglages des notifications

`NotificationSettingsView` conserve deux niveaux.

#### Push appareil

- état de compatibilité ;
- cas iPhone non installé ;
- contrôle administrateur ;
- autorisation navigateur ;
- abonnement Push ;
- désabonnement Push ;
- synchronisation avec la fonction `planning-push`.

#### Canaux personnels

La vue utilise :

```text
my_notification_channel_preferences
set_my_notification_channels
```

et permet toujours :

- Aucun ;
- Portail ;
- Push ;
- Les deux.

Les restrictions globales administrateur restent prioritaires.

### Signaler un problème

`ReportProblemView` conserve :

- la page concernée détectée ou choisie manuellement ;
- la description ;
- le contrôle de longueur ;
- la version Nethor ;
- le contexte Service Worker / cache ;
- appareil et OS ;
- navigateur ;
- dimensions d'affichage ;
- informations réseau disponibles ;
- langue / fuseau ;
- informations d'interaction disponibles.

Le signalement reste enregistré dans :

```text
reported_problems
```

avec :

- compte ;
- rôle ;
- source ;
- version ;
- user-agent ;
- diagnostic structuré.

### Services partagés ajoutés

`NethorMobileServices` expose maintenant :

```js
updateProfile(fields)
savePreferences(prefs)
changePassword(currentPassword, newPassword)
uploadAvatar(file)
removeAvatar()
notificationRules()
setNotificationChannels(ruleKey, channels)
submitProblem(payload)
```

Aucune de ces quatre vues ne crée son propre client Supabase.

### Retour vers Menu utilisateur

Les quatre sous-vues utilisent une navigation interne vers :

```text
mobile.html?view=user-menu
```

Le document n'est pas rechargé.

Le retour n'utilise plus les anciennes règles Desktop de type :

```text
profile.html → home.html
```

dans le nouveau shell Mobile.

### Cycle de vie

Chaque sous-vue possède :

```js
mount()
unmount()
render()
```

Les listeners locaux sont retirés à la sortie.

Les ressources globales suivantes restent intactes :

- session Auth ;
- client Supabase ;
- profil partagé ;
- permissions ;
- configuration ;
- notifications ;
- canaux temps réel de `MobileServices`.

### Compatibilité

Les anciennes pages restent disponibles :

- `profile.html` ;
- `settings.html` ;
- `notification-settings.html` ;
- `report-problem.html`.

Elles ne sont pas encore redirigées automatiquement vers le shell SPA.

Desktop continue donc à utiliser son architecture de pages actuelle.

## Phase 7 — Planning

La phase 7 migre Planning dans `mobile.html` sans créer une seconde implémentation métier.

### Principe

L'ancien `planning.html` et la nouvelle vue SPA utilisent désormais les mêmes briques :

```text
planning-core.css
planning-runtime.js
planning-agenda-v2.js
ui/shared/planning-shell.html
```

La différence se situe uniquement dans le conteneur :

```text
Desktop / fallback
planning.html
    ↓
planning-runtime.js

Mobile SPA
mobile.html
    ↓
PlanningView
    ↓
planning-runtime.js
```

### Externalisation du moteur historique

Le runtime métier auparavant embarqué directement dans `planning.html` a été extrait vers :

```text
planning-runtime.js
```

Il conserve les fonctions existantes :

- chargement d'une semaine ;
- lecture du modèle Planning ;
- import Excel ;
- modification du tableau ;
- enregistrement ;
- notifications liées aux modifications ;
- historique ;
- indisponibilités et congés ;
- statistiques ;
- anomalies ;
- couverture magasin ;
- vue annuelle ;
- calculs utilisateurs ;
- permissions.

La page historique continue à charger exactement ce runtime.

### CSS partagé

Les styles communs auparavant intégrés dans `planning.html` sont maintenant dans :

```text
planning-core.css
```

Dans la SPA, les feuilles Planning sont ajoutées uniquement pendant le montage de la vue puis retirées lors de `unmount()`.

Cela empêche les classes génériques historiques comme `.btn`, `.card` ou certaines règles responsive de modifier les autres vues Mobile.

### Fragment Planning

La structure métier est extraite dans :

```text
ui/shared/planning-shell.html
```

Le fragment contient les points de montage existants :

- barre semaine / calendrier ;
- toolbar ;
- planning principal ;
- import et édition ;
- couverture ;
- détection d'anomalies ;
- historique ;
- indisponibilités / congés ;
- statistiques ;
- modales ;
- vue annuelle.

`PlanningView` applique ensuite le layout Mobile via :

```js
NethorMobilePlanningLayout.build()
```

### Chargement paresseux

Le moteur Planning n'est pas chargé au démarrage de `mobile.html`.

Premier accès :

```text
Planning
   ↓
chargement CSS Planning
   ↓
planning-layout.js
   ↓
planning-runtime.js
   ↓
planning-agenda-v2.js
   ↓
mount()
```

Les scripts restent ensuite chargés dans le document.

Seules les feuilles CSS propres à Planning sont retirées lors de la sortie.

### Client Supabase

En mode SPA, `planning-runtime.js` utilise :

```js
NethorMobileServices.client
NethorMobileServices.session
NethorMobileServices.profile
NethorMobileServices.siteConfig
NethorMobileServices.subrolePermissions
```

Il ne crée donc pas un second client Supabase.

En ouverture historique de `planning.html`, le runtime conserve son initialisation classique afin de maintenir le fallback autonome.

### Permissions

Dans la SPA, l'accès Planning est calculé à partir de :

- rôle système ;
- activation de la page Planning ;
- `site_config.pages.planning.roles` ;
- `role_permissions.planning` ;
- permissions de sous-rôle.

Le niveau `manage` continue à contrôler le mode modification.

### Deep-links

Les paramètres sont conservés dans le shell :

```text
mobile.html?view=planning
mobile.html?view=planning&week=2026-10-05
mobile.html?view=planning&week=2026-10-05&day=2026-10-06
mobile.html?view=planning&week=2026-10-05&day=2026-10-06&focus=leave
mobile.html?view=planning&day=2026-10-06&focus=rest
```

Le runtime lit toujours :

```text
week
day
focus
```

Les focus reconnus restent :

- `rest` ;
- `leave`.

### Agenda Mobile

`planning-agenda-v2.js` possède maintenant :

```js
NethorPlanningAgenda.mount()
NethorPlanningAgenda.unmount()
```

Il n'essaie plus de démarrer automatiquement lorsqu'il est chargé dans `mobile.html`.

L'ordre de montage est :

```text
fragment DOM
   ↓
layout Mobile
   ↓
Agenda.mount()
   ↓
PlanningRuntime.mount()
```

Ainsi le hook Agenda est installé avant le premier rendu des données.

### Cycle de vie du runtime

`planning-runtime.js` expose :

```js
NethorPlanningRuntime.mount()
NethorPlanningRuntime.unmount()
NethorPlanningRuntime.render()
NethorPlanningRuntime.loadWeek()
```

Le démontage :

- retire le canal temps réel Planning spécifique ;
- vide le modèle courant ;
- réinitialise les états d'édition ;
- retire les classes globales Planning ;
- nettoie les datasets d'accès ;
- ne détruit pas `MobileServices`.

Les listeners globaux statiques du runtime sont installés une seule fois.

Le listener de viewport possède également un garde afin de ne pas être dupliqué après plusieurs ouvertures de Planning.

### Scroll

`PlanningView` mémorise le scroll lors du démontage.

Lors d'un retour sur le même jeu de paramètres, le scroll est restauré.

Si le lien contient :

```text
focus=rest
focus=leave
```

la restauration est désactivée afin de laisser le runtime positionner la vue sur l'élément ciblé.

### Fonctionnalités maintenues

La migration conserve notamment :

- Jour ;
- Semaine ;
- Calendrier annuel ;
- sélection d'une date ;
- semaine précédente / suivante ;
- semaine actuelle ;
- Agenda équipe ;
- affichage personnel prioritaire ;
- import Excel ;
- mode modification ;
- couleurs Matin / Après-midi / Rouge / Jaune / Orange ;
- suppression / réinitialisation ;
- total de semaine ;
- différences heures contrat ;
- anomalies ;
- couverture magasin ;
- historique Planning ;
- indisponibilités / congés ;
- demandes et traitement ;
- statistiques personnelles ;
- notifications de modification / publication.

### Fallback

`planning.html` reste disponible.

La page n'est pas redirigée de force vers la SPA.

Elle sert donc encore de chemin de secours et partage désormais le même moteur que la vue Mobile.

## Phase 8 — Chat

La phase 8 migre Chat dans `mobile.html` tout en conservant `chat.html` comme fallback autonome.

### Architecture

Le moteur existant `chat-v2.js` est désormais compatible avec deux modes :

```text
chat.html
   ↓
chat-v2.js
   ↓
client Supabase autonome

mobile.html
   ↓
ChatView
   ↓
chat-v2.js
   ↓
NethorMobileServices.client
```

Il n'existe donc pas deux implémentations de la messagerie.

### Vue Mobile

La nouvelle vue est :

```text
ui/mobile/views/chat/chat-view.js
ui/mobile/views/chat/chat-view.css
```

Elle est enregistrée sous :

```text
chat
```

### Chargement à la demande

Chat n'alourdit pas le démarrage du shell.

Au premier accès :

```text
Chat
 ↓
chat-layout.js
 ↓
chat-v2.css + chat-layout.css
 ↓
chat-v2.js
 ↓
ChatRuntime.mount()
```

Les scripts restent ensuite en mémoire.

Les feuilles de style Chat sont retirées lors de `unmount()` pour éviter que les anciennes règles globales de la page Chat n'interfèrent avec les autres vues.

### Client partagé

En SPA, Chat réutilise :

```js
NethorMobileServices.client
NethorMobileServices.session
NethorMobileServices.profile
NethorMobileServices.siteConfig
NethorMobileServices.subrolePermissions
```

La permission Chat reste calculée à partir de :

- activation de la page ;
- rôle ;
- `pages.chat.roles` ;
- `role_permissions.chat` ;
- sous-rôles.

### Fonctionnalités conservées

La migration conserve notamment :

- canal Général ;
- conversations privées ;
- groupes ;
- création de groupe ;
- ajout/retrait de membres ;
- rôles affichés dans Général ;
- présence en ligne ;
- historique de dernière présence ;
- non lus ;
- filtres ;
- archives personnelles ;
- archives administrateur ;
- sourdine ;
- réactions ;
- réponses ;
- modification/suppression de messages ;
- pièces jointes ;
- images ;
- vidéos ;
- documents ;
- audios ;
- messages vocaux ;
- lecture et vitesse des vocaux ;
- waveform ;
- recherche dans les discussions ;
- recherche dans une conversation ;
- typing en temps réel ;
- accusés de lecture ;
- fiches utilisateur ;
- gestion des groupes.

### Realtime

Le runtime conserve trois canaux métier :

```text
dataChannel
memberChannel
typingChannel
```

En SPA, il ajoute également son canal Presence sur le topic partagé :

```text
team-presence
```

Il utilise toujours le même client Supabase que le shell.

Lors de `unmount()`, Chat retire explicitement :

- le canal typing ;
- le canal données ;
- le canal profils/membres ;
- le canal presence ;
- les timers typing ;
- le timer de présence ;
- les médias en lecture ou enregistrement.

La méthode utilisée reste `removeChannel()`, conformément au cycle Realtime Supabase.

### Presence

En SPA, Chat ne dépend plus de `NettoProfileUI` pour savoir qui est en ligne.

Il rejoint lui-même `team-presence` avec le client partagé, puis synchronise la liste des utilisateurs connectés.

Il continue également à appeler :

```text
chat_presence_ping
```

afin de maintenir l'historique de présence.

### Deep-links

Les liens suivants restent pris en charge :

```text
mobile.html?view=chat&c=<conversation>
mobile.html?view=chat&user=<user>
```

Le second crée ou restaure la conversation directe correspondante.

Lorsqu'une conversation est ouverte, l'URL SPA devient :

```text
mobile.html?view=chat&c=<conversation>
```

Fermer la conversation retire uniquement `c`.

Le document `mobile.html` n'est pas rechargé.

### Scroll

`ChatView` mémorise :

- la position de la liste des discussions ;
- la position des messages.

Lors d'un retour sur la même route, ces positions peuvent être restaurées après le remontage.

### Clavier Mobile

L'ancien Chat utilisait un document plein écran indépendant.

Dans la SPA, Chat est maintenant contenu dans la ligne centrale du shell :

```text
Header Nethor
Chat
Navigation basse
```

Lorsqu'une conversation est ouverte, l'entête général du shell peut être masqué visuellement par le mode conversation.

Lorsque le clavier est ouvert, la navigation basse peut être masquée afin de laisser le composeur au-dessus du clavier sans déplacer la barre du contact.

### Fiches utilisateurs

Les fiches utilisateurs restent accessibles.

Si `NettoProfileUI` est absent dans le shell SPA, Chat charge le composant partagé `profile-user-card.js`, lequel peut maintenant utiliser `MobileServices`.

### Fallback

`chat.html` reste disponible et autonome.

Il charge le même `chat-v2.js` en mode historique et continue à créer son client Supabase lorsqu'il n'est pas dans `mobile.html`.

Aucune redirection forcée de `chat.html` vers la SPA n'est activée.

## Phase 9 — QA globale et cutover Mobile

La phase 9 transforme le shell SPA en entrée Mobile principale pour toutes les vues déjà migrées.

### Pages concernées par le cutover

Sur Mobile et Mobile Preview, les anciennes URLs suivantes basculent maintenant vers `mobile.html` :

```text
home.html                    → mobile.html?view=home
planning.html                → mobile.html?view=planning
chat.html                    → mobile.html?view=chat
notifications.html           → mobile.html?view=notifications
user-menu.html               → mobile.html?view=user-menu
profile.html                 → mobile.html?view=profile
settings.html                → mobile.html?view=settings
notification-settings.html   → mobile.html?view=notification-settings
report-problem.html          → mobile.html?view=report-problem
```

Desktop n'est pas concerné.

### Conservation des deep-links

Les paramètres métier sont transférés vers le shell.

Exemples :

```text
planning.html?week=2026-10-05&day=2026-10-06&focus=leave
→
mobile.html?view=planning&week=2026-10-05&day=2026-10-06&focus=leave
```

```text
chat.html?c=<conversation>
→
mobile.html?view=chat&c=<conversation>
```

```text
chat.html?user=<user>
→
mobile.html?view=chat&user=<user>
```

Les paramètres temporaires historiques comme `open_user_menu`, `from_user_menu` et `_nethor_update` ne sont pas propagés.

### Fallback explicite

Un fallback vers une page historique utilise maintenant :

```text
?nethor_legacy=1
```

Ce marqueur empêche la page legacy de repartir immédiatement vers `mobile.html`.

Exemple :

```text
mobile.html?view=planning
        ↓ erreur de montage
planning.html?nethor_legacy=1
```

Cela élimine le risque de boucle SPA → legacy → SPA.

### Routeur — deep-link sur la même vue

Le routeur distingue maintenant :

```text
même vue + même URL
même vue + paramètres différents
```

Cas 1 :

```text
Planning → Planning
```

sans changement de paramètres :

- pas de remount ;
- retour en haut uniquement.

Cas 2 :

```text
Planning semaine A
→ Planning semaine B
```

ou :

```text
Chat liste
→ Chat conversation
```

avec paramètres différents :

- nouvelle URL ;
- `unmount()` ;
- remontage propre de la même vue ;
- prise en compte des nouveaux paramètres.

### Historique navigateur

Un `popstate` qui reste sur la même vue mais change ses paramètres force désormais un remount propre.

Cela évite de conserver :

- une mauvaise semaine Planning ;
- une mauvaise conversation Chat ;
- un ancien focus ;
- un état DOM incohérent.

### Clavier et viewport

Le shell Mobile centralise désormais :

```text
nettoKeyboardOpen
orientation
display mode
online/offline
visualViewport
```

Lorsqu'un champ texte prend le focus :

- la navigation basse est retirée temporairement ;
- la hauteur du shell suit le viewport visuel ;
- le clavier ne recouvre plus la zone utile ;
- Chat conserve son composeur dans l'espace visible.

Cette logique bénéficie aussi à :

- Profil ;
- Personnalisation ;
- Signaler un problème ;
- recherches ;
- futurs formulaires SPA.

### Orientation

Le shell expose maintenant :

```text
data-orientation="portrait"
data-orientation="landscape"
```

et se resynchronise lors de :

- `resize` ;
- `orientationchange` ;
- changement du `visualViewport`.

### PWA

Le shell détecte maintenant :

```text
browser
standalone
```

via :

```text
display-mode: standalone
navigator.standalone
```

L'état est stocké sur le shell avec `data-display-mode`.

### Réseau

L'état :

```text
online
offline
```

est également centralisé.

Le shell ajoute un indicateur textuel « Hors ligne » dans son sous-titre lorsqu'aucun réseau n'est disponible.

### Service Worker

Le Service Worker passe en :

```text
v275
```

Les pages de cutover deviennent `network-first` :

- Accueil ;
- Planning ;
- Chat ;
- Notifications ;
- Menu utilisateur ;
- Profil ;
- Personnalisation ;
- Réglages notifications ;
- Signaler un problème.

Cela évite qu'une ancienne version HTML provenant du cache empêche le cutover.

Ces pages restent en parallèle précachées comme fallback legacy.

### Versions d'architecture

La phase 9 utilise :

```text
platform-navigation.js?v=4
mobile-router.js?v=3
mobile-app.js?v=9
mobile-app.css?v=9
Service Worker v275
```

Le Service Worker ne précache plus les anciennes versions concurrentes de `platform-navigation.js`.

### Compatibilité

La séparation reste :

```text
Desktop
→ pages HTML classiques

Mobile
→ mobile.html + MobileRouter

Fallback
→ ancienne page HTML + nethor_legacy=1
```

Aucune page Desktop n'est redirigée vers la SPA.

### QA de phase 9

Les contrôles statiques couvrent :

- syntaxe du routeur ;
- syntaxe de la navigation plateforme ;
- syntaxe du shell Mobile ;
- enregistrement des vues principales ;
- enregistrement des sous-vues ;
- conservation des deep-links ;
- fallback legacy ;
- navigation même-vue avec nouveaux paramètres ;
- `popstate` même-vue ;
- clavier ;
- orientation ;
- mode standalone ;
- réseau ;
- cache Service Worker ;
- cohérence des versions ;
- absence de redirection Mobile codée en dur dans les pages Desktop/fallback.

## Suite logique

Après cette phase de cutover, les prochaines évolutions peuvent reprendre **vue par vue** pour les outils secondaires encore en fallback — Stock F&L, Scanner, Fiches articles, Assistant Précommande, Boulangerie, Gestion, Comptes, Maintenance, etc. — sans remettre en cause le shell principal désormais stabilisé.

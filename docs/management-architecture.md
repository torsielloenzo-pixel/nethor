# Architecture de Gestion Nethor

## Principe

Gestion sépare trois responsabilités :

1. **Affichage** — un composant existe ou non et son apparence.
2. **Placement** — Mobile, Desktop, accueil, menu utilisateur ou navigation.
3. **Accès** — droits fonctionnels par rôle et sous-rôle.

Un réglage d’affichage ne doit jamais attribuer un droit utilisateur.

## Pages et fonctionnalités

Les pages sont déclarées dans le registre de modules Nethor (`profile-ui.js`).

Métadonnées recommandées :
- `group` : `principal`, `terrain`, `communication`, `administration`, `systeme`
- `platform` : `all`, `mobile`, `desktop`, `system`

Si `group` est absent, Gestion applique un classement automatique à partir de l’identifiant, du libellé, de la destination et de la plateforme.

Les droits réels restent dans **Utilisateurs & accès > Rôles & permissions**.

## Widgets

### Widgets d’affichage Mobile

Les widgets personnels de l’accueil Mobile sont pilotés par `site_config.home_widgets.<id>.enabled` et ne dépendent plus des rôles pour leur affichage global.

Widgets Mobile historiques : `welcome`, `next_shift`, `hours`, `absences`, `next_rest`, `tasks`, `important_info`, `team_today`, `quick_access`.

### Widgets Desktop

Les widgets Desktop disposent de leur propre configuration et éditeur, notamment `store_info_widget` et `quick_planning_widget`.

### Fonctionnalités sécurisées

Une fonctionnalité donnant accès à des données ou actions protégées peut conserver un contrôle d’accès par rôle. `operations_hub` suit cette règle : activation globale dans Widgets d’accueil, droits dans Utilisateurs & accès.

## Classement automatique des futurs widgets

Gestion détecte automatiquement les nouvelles clés de `site_config.home_widgets`, les nouvelles clés racine terminant par `_widget` et un éventuel registre `window.NethorWidgetRegistry`.

Métadonnées recommandées : `platform` (`mobile`, `desktop`, `all`) et `category` (`home`, `operations`, etc.). Pour une configuration racine `*_widget`, elles peuvent être placées sous `management.platform` et `management.category`.

Sans métadonnée, Gestion utilise une inférence prudente par nom. Une métadonnée explicite reste toujours prioritaire.

## Tableau de bord Desktop point de vente

La configuration de l’accueil Desktop de référence est centralisée dans `site_config.desktop_dashboard_widget`.

Elle respecte la même séparation que le reste de Gestion :

- **Structure / affichage** : entête, barre latérale, visibilité des widgets, libellés, destinations et style.
- **Contenu spécialisé** : la bannière magasin reste détaillée dans `store_info_widget` et la frise planning dans `quick_planning_widget`.
- **Données** : planning, tâches, notifications, livraisons et chat proviennent des modules Nethor existants. Le tableau de bord ne fabrique pas de valeurs de démonstration.
- **Accès** : un lien visible dans la barre latérale ne donne aucun droit supplémentaire. Les rôles, sous-rôles, RLS et contrôles serveur restent la source d’autorité.
- **Placement** : le tableau de bord est Desktop uniquement. Les widgets d’accueil Mobile gardent leur propre configuration dans `home_widgets`.

La barre latérale et l’entête Desktop lisent cette même configuration afin d’éviter qu’une personnalisation soit dupliquée dans plusieurs écrans.

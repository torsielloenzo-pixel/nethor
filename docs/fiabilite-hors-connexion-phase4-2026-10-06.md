# Nethor — Phase 4 : affichage fiable en cas d'interruption réseau

**6 octobre 2026 — v1.46.29, PWA 378**

## Règle fondamentale

Une connexion Internet, un canal Supabase Realtime « SUBSCRIBED » et une lecture réussie des données du serveur sont **trois choses différentes**. Le code ne doit afficher « Données vérifiées » qu'après une requête métier réussie et encore applicable à l'utilisateur et au contexte affichés.

Aucune donnée de Planning, de Chat ou de Notifications n'est ajoutée au cache persistant du Service Worker par cette phase.

## Nouveaux états visibles sur mobile

Le bandeau discret du shell unifié distingue :

- **Données vérifiées** : les requêtes du domaine affiché ont répondu avec succès ; l'heure de vérification est précisée. Cette preuve devient périmée après 3 minutes, ou immédiatement lors d'un événement Realtime, d'une déconnexion Realtime ou d'un passage en arrière-plan.
- **Vérification des données** : une requête de vérification est en cours.
- **Données non vérifiées** : aucune lecture valide n'a encore été obtenue après une invalidation, ou le délai de fraîcheur est dépassé.
- **Actualisation impossible** : le serveur n'a pas permis de confirmer les données ; un bouton « Réessayer » relance le rattrapage.
- **Hors connexion** : les données éventuellement encore affichées dans la session sont explicitement annoncées comme non vérifiées.

Le coordinateur `ui/mobile/mobile-sync.js` suit les requêtes par utilisateur, domaine, séquence d'invalidation et numéro de requête. Une réponse d'une ancienne session, une ancienne requête ou une opération périmée ne peut pas remettre l'état en « vérifié ».

## Par page

### Accueil

- Conserve éventuellement la dernière copie **en mémoire**, limitée au même utilisateur et au même jour, pendant une coupure.
- Ne confond pas l'absence de planning avec l'impossibilité de vérifier la semaine.
- Revalide les données invalidées au lieu de réutiliser silencieusement le préchargement.
- Tient compte d'un échec partiel lors de la lecture des tâches, des affectations et des confirmations.
- N'envoie pas de nouveau statut « Lu » sur un planning non vérifié.
- N'autorise pas de publier, supprimer, réinitialiser ou valider les tâches hors connexion.

### Planning

- Conserve la dernière version **uniquement si elle correspond à la même semaine et au même compte** ; sinon, n'affiche aucune autre semaine comme une copie plausible.
- Signale explicitement « Dernière copie consultée, non vérifiée » après un échec de lecture.
- Empêche l'ouverture d'une nouvelle édition et les écritures hors connexion.
- Conserve un brouillon créé avant une coupure. Une fois reconnecté, la sauvegarde peut être tentée grâce au contrôle atomique de version de la phase 3 : un conflit est refusé sans effacer le brouillon.
- Interdit un accusé « Lu » lorsque la version n'a pas été vérifiée.

### Chat

- Conserve les derniers messages déjà présents en mémoire plutôt que de remplacer systématiquement la conversation par un écran d'erreur après une lecture échouée.
- La liste des conversations, les messages et les réactions doivent être récupérés avec succès avant de qualifier le domaine Chat de vérifié.
- Les retours obsolètes ne remplacent pas une vérification plus récente.

### Notifications

- Une réponse réseau échouée ne transforme plus la liste en « Aucune notification ».
- Les listes déjà reçues peuvent rester visibles en mémoire avec l'avertissement de fraîcheur.
- La réception de messages Realtime, à elle seule, n'est jamais utilisée comme preuve de l'intégrité de la liste.

## Ce que cette phase ne fait pas

- Elle ne crée pas de base de données hors ligne persistante ni de file d'envoi différé : **aucune écriture métier n'est automatiquement mise en attente**.
- Si iOS a fermé l'application, l'ancien contenu en mémoire peut être perdu.
- Les autres pages et widgets qui ne passent pas encore par la validation par domaine ne sont pas tous certifiés par le bandeau.
- Le planning hors ligne reste **une référence indicative**, jamais une confirmation des horaires actuellement publiés.
- La phase 5 devra tester les coupures, reprises, changements de compte, imports concurrents et comportements Service Worker/PWA sur un véritable iPhone et plusieurs sessions authentifiées.

## Vérifications

Contrôles statiques de syntaxe et de concordance PWA/HTML/CSS, vérification qu'aucune requête Supabase n'entre dans le cache du Service Worker, et simulations non destructives de la machine d'états : lecture validée, invalidation, requête obsolète, coupure, reconnexion, changement de compte et nettoyage. Aucun horaire réel n'est écrit par ces tests.

**Validation réelle sur appareil non effectuée :** ne pas assimiler les simulations à une certification de la disponibilité hors ligne.

# Nethor Offline — Phase 6 : consultation sans connexion

**7 octobre 2026 · v1.46.31 / PWA 380**

## Objectif produit

L'utilisateur ne doit pas voir d'indicateur technique lorsque les données sont correctement accessibles. Le bandeau du shell mobile reste donc **masqué en fonctionnement normal**, y compris pendant les vérifications silencieuses. Il apparaît pour annoncer **« Mode hors connexion · consultation uniquement »**, ou lorsqu'une requête serveur importante échoue. L'ancien bandeau vert « Données vérifiées à … » et la ligne répétitive « Planning récupéré du serveur » n'encombrent plus l'accueil.

**Aucune possibilité de modification hors réseau** n'est ajoutée : ni queue de synchronisation, ni enregistrement différé, ni déclaration « Lu » sur une copie locale.

## Périmètre effectivement disponible

| Écran | Hors connexion après consultation en ligne |
| --- | --- |
| Accueil | Dernières données de la journée du compte actuellement authentifié (stockées 36 h maximum et jamais réutilisées pour une autre date) |
| Planning | Semaines consultées et publiées (conservées jusqu'à 7 jours) ; navigation entre les semaines sauvegardées |
| Chat | Message d'indisponibilité ; aucun historique de conversation persisté |
| Notifications | Pas de nouvelle récupération ni modification hors réseau |
| Autres modules métier | Pas de garantie de fonctionnement hors connexion en phase 6 |

Les fichiers du shell et leurs scripts/styles sont présents dans le precache du **Service Worker**. La donnée métier locale est conservée dans **IndexedDB**, jamais dans le Service Worker.

## Isolation et limites de sécurité

- Stockage associé à l'UUID de l'utilisateur pour `shell`, `home` et `planning`. Aucun autre utilisateur ne peut accéder à la copie par l'API applicative s'il n'a pas la même identité locale active.
- Un utilisateur doit **s'être connecté en ligne et avoir consulté les données**. Une copie inutilisée ou appartenant à un autre jour/semaine ne sera pas présentée comme le planning actuel.
- Après déconnexion ou changement de compte, Nethor tente d'effacer les données du compte précédent. La suppression du stockage navigateur ou une réinstallation supprime également la copie.
- La copie du profil nécessaire à l'affichage dure **48 heures** et ne conserve qu'un sous-ensemble de champs : nom affiché, rôle, couleur, thème, sous-rôles. Aucun jeton de session, mot de passe, URL de stockage ou client Supabase n'est stocké par ce module.
- **L'identification dépend toujours de la session Supabase locale.** Si elle a expiré ou ne peut pas être relue sans le réseau, Nethor demande une reconnexion. Il ne contourne pas les permissions serveur pour forcer l'ouverture.
- Les données en IndexedDB ne bénéficient **pas d'un chiffrement supplémentaire propre à Nethor**. Pour un déploiement sur des appareils partagés ou non maîtrisés, cette protection supplémentaire et la politique de conservation sont des prérequis à étudier.
- iOS peut évincer son stockage sous contrainte. Le cache est une aide à la consultation, **pas une garantie de conservation permanente**.
- Les droits peuvent avoir changé depuis la dernière vérification : le contenu hors ligne doit toujours être considéré comme **indicatif, potentiellement ancien**.

## Fonctionnement technique

1. En ligne, `MobileServices` sauvegarde un profil minimal dès qu'une synchronisation authentifiée complète réussit. Les charges utiles de l'accueil sont sauvegardées uniquement si tous les flux requis ont répondu correctement.
2. La lecture d'une semaine publiée sauvegarde son modèle avec sa révision serveur ; les brouillons et références de fichiers sources sont exclus.
3. Lorsqu'un écran est rouvert sans Internet, `NethorOfflineStore` recherche la donnée par utilisateur + domaine + date/semaine. Les lectures expirées ou incompatibles sont ignorées.
4. Si la connexion revient, les pages utilisent les mécanismes de revalidation des phases 1 à 4. **Seule la version serveur** peut autoriser de nouvelles écritures et générer un statut « Lu ».
5. Lorsqu'aucun cache ou profil local utilisable n'existe, un écran explicite indique qu'une première consultation avec Internet est nécessaire.

## Validation

La suite `tests/phase6-offline.test.cjs` vérifie le stockage IndexedDB simulé avec réouverture, isolation de comptes, nettoyage, refus d'écriture hors réseau, expiration, restauration des semaines et suppression de l'affichage vert normal. Elle tourne avec `tests/phase5-regression.test.cjs` dans GitHub Actions.

**À vérifier physiquement avant certification :** iPhone en mode avion, fermeture complète depuis le multitâche puis relance, session locale expirée, changement de compte, suppression des données Safari, redémarrage du téléphone, retour réseau et actualisation du dernier planning. Aucune session iPhone réelle n'est simulée comme telle dans les tests Node.

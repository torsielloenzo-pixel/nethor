# Fiche magasin Google — en-tête Desktop Nethor

## Usage
Le bouton « Netto Le Thor · Point de vente » ouvre une fiche flottante accessible depuis les pages Desktop. Elle affiche :
- Adresse et téléphone du magasin, relié au Place ID Google fixe `ChIJSY7JsE71tRIRRSih3toBniY`.
- État d'ouverture `currentOpeningHours.openNow`, prochaine fermeture `nextCloseTime`, prochaine ouverture `nextOpenTime`.
- Horaires d'aujourd'hui fournis par Google lorsqu'ils sont disponibles, sinon **horaires habituels** de la mairie du Thor, clairement indiqués.
- Lien pour consulter l'affluence **directement sur Google Maps** (l'affluence n'est pas disponible via l'API officielle Places).

Le client passe par `ui/desktop/store-google-card.js` et l'Edge Function Supabase `store-google-details`. Aucune clé secrète n'est exposée dans le dépôt public.

## Activation des données Google en temps réel
1. Dans **Google Cloud Console**, créer ou sélectionner un projet avec facturation activée.
2. Activer **Places API (New)** puis créer une clé d'API réservée à ce service. Restreindre la clé par **API restriction**, fixer des quotas adaptés.
3. Dans **Supabase > projet Nethor > Edge Functions > Secrets**, créer le secret nommé exactement `GOOGLE_PLACES_API_KEY` avec la clé. Ne jamais le placer dans `home.html`, GitHub, la console du navigateur ou un message public.
4. La fonction `store-google-details` est déployée avec validation JWT et contrôle de session; elle appellera automatiquement l'API lors de l'ouverture de la fiche.
5. Recharger Nethor et cliquer sur le magasin. Les éléments issus de Google affichent « Données consultées à HH:MM ».

## Source de secours
La ville du Thor référence Netto : **150 chemin Saint-Michel, 84250 Le Thor** et **04 90 01 34 23**.
Horaires de secours configurés dans Nethor à partir des indications fournies par le magasin :
- **Lundi à samedi : 08:00–20:00**
- **Dimanche : 09:00–12:30**

Source d'adresse et de contact : https://www.ville-lethor.fr/contacts/netto/

Si Google est indisponible, ou si Google répond sans fournir `openNow`, Nethor calcule localement le statut estimé en fuseau `Europe/Paris` et affiche par exemple :
- **Ouvert · horaires habituels** — « Ferme à 20:00 · non vérifié en direct »
- **Fermé · horaires habituels** — « Ouvre demain à 09:00 · non vérifié en direct »

La fiche distingue systématiquement le statut basé sur les horaires **habituels** du statut réel obtenu de Google. Cela ne garantit pas les ouvertures exceptionnelles, jours fériés, changements de planning ou fermetures temporaires. Les états explicitement « temporairement fermé » ou « définitivement fermé » signalés par Google prévalent sur le planning local.

Lorsque la fenêtre reste ouverte, le statut local est recalculé toutes les 30 secondes. Le système tente de récupérer les données Google toutes les 2 minutes, comme auparavant.

## Confidentialité et coûts
- Endpoint réservé aux utilisateurs authentifiés, sans paramètres permettant d'interroger d'autres établissements.
- La clé reste dans les secrets Supabase; elle n'est jamais renvoyée à Nethor.
- Une actualisation sur ouverture, un cache client de 60 secondes et une actualisation automatique toutes les 2 minutes lorsque la fiche est ouverte.
- Les appels Places API peuvent être facturés selon les tarifs Google et les champs demandés.
- Les informations d'affluence Google Maps sont visibles uniquement si Google les publie pour ce magasin.

Documentation : https://developers.google.com/maps/documentation/places/web-service/place-details

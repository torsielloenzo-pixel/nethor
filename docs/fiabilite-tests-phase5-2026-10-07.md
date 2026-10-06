# Nethor — Phase 5 : prévention des régressions et surveillance

**7 octobre 2026 — v1.46.30, PWA 379**

## Résultats obtenus

### Tests automatisés

Le dépôt contient `.github/workflows/nethor-regression.yml`, déclenché sur les PR, sur `main` et manuellement.

Commande locale : `node --test tests/phase5-regression.test.cjs` (Node 22, sans dépendance npm).

La suite vérifie notamment :
- Un canal Realtime par session ; nettoyage au changement de compte.
- Aucun statut « vérifié » sur simple ouverture du canal.
- Invalidation immédiate, expiration et refus des confirmations tardives.
- Deux sessions simulées recevant le même changement de planning.
- Coupure, reconnexion et séparation des états entre deux utilisateurs.
- Enregistrements concurrents testés sur le code réel de `saveWeek` avec un faux serveur atomique.
- Limitation de la télémétrie aux codes connus, sans contenu d'exception.
- Correspondance des versions mobile / service worker / serveur.
- Présence des RPC atomiques et des politiques d'accès au journal.
- Absence de récupération d'identifiants personnels dans l'interface Santé.

**Portée :** simulation de sessions et de transport ; aucune session réelle ni aucun horaire de production n'est modifié par les tests. Les tests ne remplacent pas une validation en navigateur iOS.

### Journal de santé

Dans **Gestion > Maintenance**, l'administrateur voit :
- Le nombre d'événements sur sept jours (jusqu'à 200 remontées par lecture).
- La répartition par domaine et code d'incident.
- Les 30 événements les plus récents, avec date, plateforme et numéro de version.

Les événements côté client utilisent uniquement `domain`, `code`, `platform` et `build` ; le serveur renseigne automatiquement l'utilisateur authentifié et l'horodatage pour appliquer une limite de fréquence. **Ne sont pas collectés :** contenu des conversations, horaires, noms affichés, URL, adresses IP, piles d'exception, messages d'erreur libres.

Sécurité : RLS activée, INSERT limité aux quatre colonnes métier, SELECT réservé à la permission administrateur `portal_admin/manage`, aucun UPDATE/DELETE des rôles clients, session active requise, maximum 30 remontées par tranche de 15 minutes et par compte, plus déduplication locale cinq minutes et maximum 20 événements par session. Purge des événements de plus de 30 jours lors de l'arrivée d'un nouvel événement.

**Limite :** l'absence d'événement n'est pas une preuve d'absence de bugs : un navigateur hors ligne, une session non ouverte ou un chargement qui échoue avant l'initialisation peut ne rien envoyer. Il n'y a pas de notification automatique d'alerte dans cette version ; l'administrateur doit consulter Maintenance.

## Campagne physique à réaliser pour certifier la fiabilité

Préparer un **environnement de test distinct** et deux comptes autorisés ; ne pas modifier un vrai planning utilisé par le magasin.

| Scénario | Étapes | Résultat attendu |
| --- | --- | --- |
| Deux responsables | A et B ouvrent la même semaine, A modifie et enregistre, B enregistre son ancien brouillon | B reçoit un conflit, la version de A demeure, brouillon de B préservé |
| Mobile + ordinateur | Importer une nouvelle semaine sur ordinateur, puis vérifier sur iPhone | Dernière version affichée et accusé « Lu » lié uniquement à la version vue |
| Remplacement d'import | Importer puis remplacer un Excel pendant qu'un employé consulte | Ancien accusé invalidé, aucun faux « Lu » |
| Réseau coupé | Ouvrir puis couper Wi-Fi et données mobiles | État « Hors connexion », aucune écriture ni accusé erroné |
| Reconnexion | Rétablir le réseau pendant que les données sont périmées | Affichage non vérifié jusqu'à réussite d'une lecture serveur |
| Application en veille | Quitter vers l'écran d'accueil puis revenir sur iPhone | Vérification avant de marquer les informations comme actuelles |
| Requêtes inversées | Simuler connexion lente avec deux chargements | La première réponse retardée n'écrase pas la dernière |
| Comptes distincts | Déconnecter A et connecter B sur le même appareil | Données et état de fraîcheur de A effacés |
| Canal Chat | Envoyer un message depuis ordinateur, afficher sur iPhone | Synchronisation, pas de double insertion ni de « Lu » artificiel |
| Diagnostics | Avec un compte de test, déclencher une erreur contrôlée | Catégorie et version visibles en Gestion ; accès refusé à un employé |

Enregistrer le **résultat réel**, le type d'appareil, le navigateur/PWA, la date, et les anomalies constatées, sans capturer de données métier sensibles.

## Points ouverts

La version 379 introduit une surveillance, mais **pas de supervision automatique 24 h/24** ni de garantie de disponibilité. Les modules qui ne passent pas encore par les états de fraîcheur du shell mobile doivent être audités séparément. Tester également le comportement des anciens clients PWA lors des mises à jour.

La certification multi-appareils sera possible seulement après l'exécution et la réussite documentée de cette campagne physique.

## Vérification CI et renforcement des droits — 7 octobre 2026

La première exécution réelle GitHub Actions de la phase 5 sur la PR n°14 (**run `37541064185`**) a été vérifiée : **10 tests réussis, 0 échec**, et étape de validation syntaxique réussie.

### Suivi de l'audit

- Le test de cohérence PWA utilise désormais le numéro de version depuis `app-version.json`, les références réelles de `mobile.html` et le manifeste du Service Worker. Un changement futur de version ne doit pas nécessiter de réécrire les assertions ; les décalages de scripts restent détectés.
- Des scénarios supplémentaires vérifient directement le chargeur `loadWeek()` réel : cache de la même semaine conservé uniquement pour le même compte, rejet de la copie d'une autre semaine, coupure réseau, brouillon local, retour d'une lecture autoritaire. Aucun reçu de lecture n'est émis par ces tests.
- Le journal était consultable via la permission `portal_admin/manage`, ce qui pourrait être trop large si cette permission est déléguée. La migration `database/2026-10-07-client-health-strict-admin-phase5.sql` exige désormais **également `profiles.role='admin'` et une session active**. Les quatre colonnes de télémétrie et les politiques d'insertion restent inchangées.
- La table `public.nethor_client_health_events` était vide lors de la vérification (aucune donnée test injectée). Les privilèges à l'insertion sont limités aux colonnes `domain`, `code`, `platform`, `build`. Les comptes anonymes ne peuvent pas lire les données et les utilisateurs connectés ne peuvent pas forger `user_id`.

**Limite maintenue :** la réussite CI prouve des scénarios simulés et des contrôles statiques, pas la livraison effective d'un message Realtime sur deux appareils physiques ni l'installation du Service Worker sur un iPhone donné.

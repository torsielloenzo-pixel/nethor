# Maintenance Nethor

Ce document fixe le socle de maintenance sans modifier la logique métier.

## Priorités

1. Sécurité serveur et permissions.
2. Stabilité et gestion des erreurs.
3. Non-régression.
4. Simplicité.
5. Performance mesurable.
6. Nettoyage confirmé.

## Règles avant suppression

Un fichier, style, script, asset, RPC, table, politique, fonction ou index n'est supprimé que si son absence d'utilisation est vérifiée dans le dépôt **et** dans les dépendances runtime pertinentes.

En cas de doute, conserver et documenter.

## Frontières de sécurité

- L'affichage conditionnel dans l'interface n'est jamais une autorisation.
- Les écritures sensibles doivent être protégées par RLS, RPC contrôlée ou Edge Function authentifiée.
- Une Edge Function utilisant la service role doit vérifier l'utilisateur et son autorisation avant toute opération privilégiée.
- Aucun secret serveur ne doit être ajouté au client.
- Les rôles applicatifs restent : `admin`, `point_vente`, `responsable`, `employe`, `lecture`.

## Checklist de non-régression

### Authentification
- connexion et déconnexion ;
- restauration de session après actualisation ;
- changement de compte ;
- demande de réinitialisation de mot de passe.

### Permissions
Pour chaque rôle, vérifier l'accès direct par URL et les opérations serveur, pas seulement la visibilité des menus.

### Fonctionnalités
- Accueil et tâches du jour ;
- Planning : classique/agenda, jour/semaine/année, widgets, modifications et notifications ;
- Stock Fruits & Légumes ;
- Boulangerie ;
- Fiches articles ;
- Scanner caméra et recherche EAN ;
- Chat général/direct/groupe et pièces jointes ;
- Notifications ;
- Profil et personnalisation ;
- Comptes, rôles et permissions ;
- Journal et problèmes rapportés.

### Mobile
- Safari iPhone et Chrome Android ;
- portrait/paysage ;
- clavier virtuel ;
- safe areas ;
- navigation fixe ;
- modales/overlays ;
- absence de scroll horizontal ;
- scanner/caméra.

### Desktop
- redimensionnement ;
- navigation et modales ;
- tableaux/widgets ;
- visualisateur mobile administrateur.

### PWA
- installation ;
- démarrage ;
- mise à jour du Service Worker ;
- navigation avec cache existant ;
- récupération après ressource réseau indisponible.

## Contrôles sécurité constatés au 28/09/2026

- RLS activé sur les tables publiques inspectées.
- Les fonctions `SECURITY DEFINER` ne doivent pas être converties ou supprimées uniquement à cause du lint : vérifier leur contrôle `auth.uid()` / rôle / module.
- `profiles` protège les champs administratifs par trigger côté base.
- Les clés `service_role` restent exclusivement côté serveur.
- Les index signalés comme inutilisés ne constituent pas, seuls, une preuve suffisante pour les supprimer.

## Changements à éviter

- fusion globale des CSS historiques sans inventaire page par page ;
- réécriture des gros fichiers HTML/JS uniquement pour la forme ;
- suppression d'index basée sur une courte fenêtre de statistiques ;
- changement simultané de sécurité, UI et logique métier dans le même correctif.

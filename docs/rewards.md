# Défis et boutique — espace administrateur

Ouvrir `rewards.html` depuis l’accueil, le menu utilisateur ou **Mon profil**.

- **Administrateur uniquement** : le menu, la page Défis & Boutique, les missions, le catalogue, la collection, l’historique, le classement et la gestion boutique sont réservés au rôle `admin`.
- Les autres rôles ne voient pas le menu Défis & Boutique et un accès direct à `rewards.html` les renvoie vers l’accueil.
- L’administrateur peut utiliser tout objet actif de la boutique **sans restriction de jetons**. Ajouter un objet à sa collection ne diminue pas son solde.
- Depuis **Mon profil**, l’administrateur peut équiper ou retirer directement un avatar virtuel, un cadre, un accessoire, un titre et un thème d’accent. Un objet actif peut être équipé même s’il n’avait pas encore été ajouté manuellement à la collection.
- Les réglages de profil classiques restent centralisés dans **Mon profil** : photo, couleur, statut, mode clair/sombre et mot de passe.

Le rôle est lu dans `profiles` et vérifié côté base via `has_role`. Les fonctions RPC de récompenses restent protégées côté serveur : masquer un bouton dans l’interface n’est pas considéré comme une autorisation suffisante.

Les missions expirées restent visibles mais ne sont plus réservables. Les réservations expirées sont libérées lors de l’action suivante. Une correction rouvre la mission. Une mission validée ne peut pas être validée de nouveau.

La boutique conserve les prix pour préparer une éventuelle ouverture future à d’autres rôles, mais ces prix sont informatifs pour l’administrateur. Un objet retiré de la vente reste utilisable s’il était déjà possédé. Un objet de chaque catégorie peut être équipé.

Les décorations sont rendues par `reward-profile.js` dans les zones de profil compatibles.

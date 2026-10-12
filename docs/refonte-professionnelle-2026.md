# Nethor — Refonte professionnelle mobile & desktop

Statut : proposition de migration, sans modification de la production.

## Objectif
Faire du planning le centre de l'expérience, avec un tableau de bord opérationnel et une interface cohérente.

## Navigation desktop
- Vue d'ensemble
- Planning (semaine, jour, année, couverture, anomalies, suivi de lecture)
- Équipe
- Congés et indisponibilités
- Promotions
- Fiches articles
- Messages
- Signalements
- Administration (accès par rôle)
- Paramètres

## Navigation mobile
- Accueil
- Planning (personnel, équipe, jour, couverture)
- Messages
- Outils (congés, promotions, fiches articles, scanner, signalements, équipe)
- Profil, notifications et paramètres dans l'en-tête

## Principes UI
- Fond neutre, surfaces blanches, bleu nuit et accent orange maîtrisé.
- Grilles de planning denses mais lisibles, sticky headers et colonnes utilisateurs.
- États explicites : chargement, erreur, vide, hors connexion, modification non enregistrée.
- Responsive desktop/tablette/mobile et accessibilité clavier.
- Ne jamais coder des chiffres d'effectifs fictifs en production.

## Invariants fonctionnels
- Conserver la structure des données Supabase et les contrôles RLS.
- Ne pas modifier les permissions côté serveur sans audit.
- Préserver imports de planning, historiques, notifications, chat, congés, scanner et promotions.
- Les comptes désactivés ne figurent pas dans les vues actives.
- Dernier planning importé = référence unique sur mobile et desktop.
- Réinitialisation des statuts de lecture lors d'une modification/import, selon la logique existante.
- Préserver la séparation de chargement des assets desktop/mobile.

## Ordre de migration
1. Audit des routes, scripts et composants actuels; tests de non-régression.
2. Tokens visuels et composants communs; mise en page desktop/mobile.
3. Planning et couverture magasin.
4. Accueil et tableau de bord.
5. Équipe, congés, messages et outils.
6. Administration et paramètres.
7. Tests fonctionnels, rôles, PWA, iOS, sécurité et performance.
8. Validation sur préproduction avant fusion et déploiement.

## Critères de validation
- Tous les rôles peuvent accéder uniquement aux fonctions autorisées.
- Planning identique sur tous les appareils.
- Aucun import, message, historique ni compte perdu.
- Pas de boucles de rechargement, de chevauchement ni de navigation cassée.
- Repli sûr en cas d'échec de chargement.

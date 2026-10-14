# Phase 6 — Recette finale préproduction

Date de démarrage : 14 octobre 2026  
Branche : `refonte-professionnelle-planning-20261012`  
PR : #40

## Objectif

Valider la refonte professionnelle avant toute fusion dans `main` et tout déploiement sur nethor.fr.

Aucune étape de cette recette ne doit modifier les données de production.

## Portes automatiques

### A. Non-régression Node / SQL
- [x] Syntaxe des scripts critiques contrôlée.
- [x] Suite de non-régression professionnelle intégrée.
- [ ] Simulation PostgreSQL jetable validée sur le dernier HEAD.

### B. Recette navigateur isolée
- [x] Connexion testée en Chromium et WebKit.
- [x] Réinitialisation mot de passe testée en Chromium et WebKit.
- [x] Viewports 375 / 390 / 1024 / 1440 contrôlés pour les écrans d'authentification.
- [ ] Équipe contrôlée en Chromium + WebKit, mobile + desktop.
- [ ] Promotions contrôlé en Chromium + WebKit, mobile + desktop.
- [ ] Fiches articles contrôlées en Chromium + WebKit, mobile + desktop.
- [ ] Signalements contrôlés en Chromium + WebKit, mobile + desktop.
- [ ] Captures de recette générées sans accès Supabase production.

Le test `tests/ui/stage23-professional-pages.cjs` bloque tout trafic externe et remplace Supabase par un client synthétique.

### C. Auth / rôles sur stack locale
- [ ] Stack Supabase locale démarrée.
- [ ] Sessions fictives testées.
- [ ] Révocation / compte désactivé testés.
- [ ] Politiques de rôle Planning testées.
- [ ] Récupération de mot de passe locale testée.
- [ ] Fonctions Edge locales testées.

Le workflow Auth est explicitement rattaché à la recette professionnelle afin d'exécuter le banc isolé pendant cette phase.

## Parcours fonctionnels à valider avant publication

### Connexion et session
- [ ] Connexion normale.
- [ ] Déconnexion.
- [ ] Rechargement avec session existante.
- [ ] Compte désactivé : déconnexion forcée.
- [ ] Changement de rôle : droits recalculés sans conserver les anciens accès.

### Planning
- [ ] Semaine actuelle identique desktop / mobile.
- [ ] Jour sélectionné identique desktop / mobile.
- [ ] Vue annuelle.
- [ ] Couverture magasin.
- [ ] Analyse / anomalies.
- [ ] Import Excel.
- [ ] Remplacement d'un planning existant.
- [ ] Conflit de sauvegarde.
- [ ] Statuts de lecture.
- [ ] Comptes désactivés absents des vues actives.

### Congés et indisponibilités
- [ ] Demande Employé / Responsable.
- [ ] Validation par rôle autorisé.
- [ ] Refus.
- [ ] Annulation.
- [ ] Double validation concurrente impossible.

### Accueil
- [ ] Prise de poste correcte.
- [ ] Équipe active correcte.
- [ ] Tâches du jour selon rôle.
- [ ] KPI cohérents avec les données affichées.

### Équipe
- [ ] Comptes actifs uniquement.
- [ ] Présence en ligne.
- [ ] Filtre encadrement.
- [ ] Recherche.
- [ ] Ouverture fiche utilisateur.
- [ ] Accès conversation.

### Chat
- [ ] Général.
- [ ] Message direct.
- [ ] Groupe.
- [ ] Épingles admin.
- [ ] Suppression selon rôle.
- [ ] Archives.
- [ ] Réactions.
- [ ] Pièces jointes.

### Promotions
- [ ] Consultation.
- [ ] Import réservé aux rôles autorisés.
- [ ] Analyse catalogue.
- [ ] Validation / correction produit.

### Fiches articles
- [ ] Recherche EAN13.
- [ ] Recherche texte.
- [ ] Activation / désactivation selon permission.
- [ ] Familles réservées aux rôles prévus.
- [ ] Scanner mobile.

### Notifications
- [ ] Lu / non lu.
- [ ] Liens de destination.
- [ ] Réglages Portail / Push.
- [ ] Déduplication.

### Profil / Paramètres
- [ ] Photo / avatar.
- [ ] Cadre avatar.
- [ ] Couleur profil.
- [ ] E-mail.
- [ ] Mot de passe.
- [ ] Thème.
- [ ] Sons.
- [ ] Préférences persistantes après reconnexion.

### Gestion / permissions
- [ ] Administrateur.
- [ ] Point de vente.
- [ ] Responsable.
- [ ] Employé.
- [ ] Lecture seule.
- [ ] Sous-rôles / permissions personnalisées.
- [ ] Aucun contrôle sensible uniquement côté interface.

## Validation physique obligatoire

Ces points ne doivent pas être certifiés uniquement par CI :

- [ ] iPhone réel — Safari.
- [ ] iPhone réel — PWA installée.
- [ ] Rotation / clavier / safe areas.
- [ ] Caméra Scanner.
- [ ] Perte puis retour de connexion.
- [ ] Rafraîchissement après mise à jour Service Worker.
- [ ] Desktop réel avec écran large et fenêtre réduite.

## Critère GO production

La PR peut sortir du statut Draft uniquement si :

1. tous les workflows obligatoires sont verts ;
2. aucun défaut bloquant ou majeur n'est ouvert ;
3. les parcours Planning et Auth sont validés ;
4. une validation iPhone/PWA réelle est faite ;
5. le plan de retour arrière est confirmé.

## Retour arrière

En cas d'incident après publication :

1. ne pas modifier les données pour corriger un défaut purement visuel ;
2. revenir au commit `main` précédant la fusion ;
3. purger / invalider les assets PWA concernés si nécessaire ;
4. vérifier Planning, Auth et Service Worker avant de republier.

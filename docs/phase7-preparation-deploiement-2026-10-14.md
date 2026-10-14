# Phase 7 — Préparation au déploiement Nethor

Date d'ouverture : 14 octobre 2026  
PR candidate : #40  
Branche candidate : `refonte-professionnelle-planning-20261012`

## Statut

Cette phase prépare la publication mais **n'autorise pas encore la fusion**.

La PR doit rester en Draft tant que la recette Phase 6 et la validation physique iPhone/PWA ne sont pas terminées.

## Référence de retour arrière

Au démarrage de cette phase, `main` pointe sur :

`56a1579278a2929d41ada64d2340019fea9a147c`

Cette référence est le point de comparaison et de retour arrière à conserver si aucun autre changement n'est fusionné dans `main` avant la publication.

Avant toute fusion, revalider impérativement le SHA de `main`. S'il a changé, mettre à jour ce document et réévaluer le diff de la PR.

## Cible publique vérifiée

- GitHub Pages est activé sur le dépôt.
- Le fichier `CNAME` de `main` contient `nethor.fr`.

Le mécanisme exact de source/publication GitHub Pages doit être revalidé au moment du GO ; cette checklist ne suppose pas qu'une fusion déclenche automatiquement la production.

## Préflight backend Supabase — lecture seule

Projet vérifié : `gioxrpaiwogqqtakjpnv` (projet utilisé par le frontend Nethor).

### Prérequis présents
- `nethor_security_context()` présent.
- `planning_save_week_if_revision(...)` présent et protège déjà la session, la permission Planning et la révision concurrente.
- `list_team_members()`, `my_subrole_permissions()`, `my_subrole_keys()` et `chat_admin_delete_message(...)` présents.
- tables critiques Profil / Planning / Notifications / Sous-rôles / Chat présentes.
- Edge Functions Nethor actives, dont `password-recovery-email`.

### Durcissements validés en local mais pas encore déployés
Le contrôle de production a confirmé que les MD5 des fonctions auditées correspondent encore exactement aux versions **pré-durcissement** inscrites dans `docs/security/etape16-rpc-hardening-proposal.sql`.

En particulier, la production n'a pas encore le contrôle `private.session_is_active()` ajouté par la proposition sur :
- `private.list_team_members_impl()` ;
- `private.chat_can_manage(uuid,uuid)` ;
- `public.my_subrole_keys()` ;
- `public.my_subrole_permissions()` ;
- plusieurs RPC Chat / Notifications inclus dans la proposition.

Le préflight de la proposition Étape 16 correspond actuellement aux fonctions live : il détecterait toute dérive avant application.

### Récupération de mot de passe
La candidate frontend envoie désormais `request_id` + `token_hash` lors de la confirmation d'une récupération.

La production utilise encore l'ancienne Edge Function `password-recovery-email` et ne possède pas encore :
- `recovery_proof_digest` ;
- `password_changed_verified_at` ;
- `confirmation_notification_at` ;
- `confirmation_notification_status` ;
- le trigger `nethor_record_verified_password_change`.

Le banc local valide la version renforcée, mais **aucune migration ni Edge Function de sécurité n'a été appliquée à la production pendant cette phase**.

### Gate backend
- [ ] faire approuver explicitement le déploiement des durcissements backend ;
- [ ] appliquer la proposition RPC Étape 16 avec son preflight ;
- [ ] appliquer la preuve Auth Étape 20 ;
- [ ] déployer la candidate `password-recovery-email` correspondante ;
- [ ] recontrôler les fonctions, le trigger et les colonnes en lecture seule ;
- [ ] effectuer une récupération réelle contrôlée avant le GO frontend.

## Gel de la candidate

Avant publication :

- [ ] tous les workflows du HEAD candidat sont verts ;
- [ ] aucune correction fonctionnelle supplémentaire n'est en attente ;
- [ ] noter le SHA exact du HEAD candidat ;
- [ ] noter le SHA exact de `main` ;
- [ ] vérifier que la PR est toujours mergeable ;
- [ ] vérifier le diff final et les fichiers sensibles ;
- [ ] ne plus ajouter de fonctionnalité jusqu'au contrôle post-production.

## Validation obligatoire avant GO

### Automatique
- [ ] Tests de fiabilité verts.
- [ ] Auth Supabase isolée verte.
- [ ] Chromium + WebKit recette verte.
- [ ] PWA / Service Worker synchronisés.
- [ ] Aucun débordement horizontal détecté aux viewports testés.

### Fonctionnelle
- [ ] Planning desktop/mobile cohérent.
- [ ] Droits des cinq rôles cohérents.
- [ ] Compte désactivé réellement bloqué.
- [ ] Sauvegarde concurrente Planning bloquée.
- [ ] Congés/indisponibilités sans double validation.
- [ ] Chat et actions sensibles conformes aux permissions.

### Physique
- [ ] iPhone réel — Safari.
- [ ] iPhone réel — PWA installée.
- [ ] Caméra Scanner.
- [ ] Clavier, rotation et safe areas.
- [ ] Passage hors connexion → reconnexion.
- [ ] Mise à jour Service Worker.
- [ ] Desktop réel, fenêtre large puis réduite.

## Ordre de publication

1. arrêter les modifications sur la branche candidate ;
2. relever les SHA candidate et `main` ;
3. vérifier les trois workflows sur le SHA candidat exact ;
4. terminer la validation physique ;
5. sortir la PR du statut Draft uniquement après GO ;
6. fusionner la PR dans `main` ;
7. confirmer le déclenchement du mécanisme de publication configuré ;
8. attendre que la version publiée corresponde au commit attendu ;
9. effectuer le contrôle post-déploiement ;
10. seulement ensuite considérer la publication comme terminée.

## Contrôle post-déploiement

À réaliser immédiatement après publication, sans modifier inutilement les données :

- [ ] connexion d'un compte de test autorisé ;
- [ ] Accueil desktop ;
- [ ] Planning semaine desktop ;
- [ ] Planning semaine mobile ;
- [ ] navigation Équipe / Chat / Promotions / Articles ;
- [ ] Profil / Paramètres / Notifications ;
- [ ] PWA recharge la nouvelle version ;
- [ ] aucune boucle de redirection ;
- [ ] aucune erreur critique visible ;
- [ ] aucune différence de Planning entre mobile et desktop.

## Conditions d'arrêt immédiat

Stopper la publication ou déclencher le retour arrière si l'un de ces points apparaît :

- connexion impossible pour des comptes valides ;
- accès à un module interdit par rôle ;
- planning actuel absent, ancien ou divergent ;
- import/sauvegarde Planning incorrect ;
- boucle de redirection desktop/mobile ;
- Service Worker bloquant la nouvelle version ;
- erreur généralisée sur l'Accueil, le Planning ou le Chat ;
- données de production modifiées par erreur pendant une opération de validation.

## Retour arrière

Si un incident bloquant apparaît après fusion :

1. identifier le commit de fusion ;
2. restaurer le contenu fonctionnel correspondant au SHA `main` de référence ci-dessus, ou effectuer un revert propre du commit de fusion ;
3. ne pas supprimer ou altérer les données Supabase pour corriger un problème de frontend ;
4. republier la version restaurée ;
5. contrôler Auth, Planning, PWA et navigation ;
6. traiter ensuite le défaut sur une nouvelle branche.

## GO / NO-GO

**État actuel : NO-GO volontaire.**

Motifs restants :
1. les durcissements backend validés en environnement isolé ne sont pas encore appliqués à Supabase production ;
2. la validation physique iPhone/PWA reste à effectuer.

La recette navigateur automatisée étendue est désormais verte.

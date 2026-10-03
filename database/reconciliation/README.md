# A4 — Réconciliation Supabase ↔ GitHub

Démarré le **3 octobre 2026**.

## Objectif

Rendre l'état de production Nethor auditable et reconstructible depuis le dépôt, sans dépendre uniquement de la base Supabase vivante.

## État mesuré

- Migrations enregistrées en production : **107**
- Artefacts SQL actuellement présents dans `database/` : **38**
- Migrations contenant des opérations d'écriture de données : **64**
- Migrations contenant au moins un UUID littéral : **4**
- Ces 4 migrations sont classées **spécifiques à l'environnement** et ne doivent pas être rejouées automatiquement dans une nouvelle base sans adaptation.

L'écart 107 ↔ 38 ne signifie pas que 69 migrations sont absentes : certains fichiers historiques regroupent plusieurs migrations live. Le dépôt ne possède toutefois pas encore une correspondance déterministe migration-par-migration.

## Fichiers de référence créés

### `production-migration-registry.json`
Registre canonique de l'historique Supabase.

Pour chaque migration :
- version ;
- nom ;
- nombre de statements ;
- taille du SQL ;
- MD5 du SQL exact conservé par Supabase ;
- présence d'écriture de données ;
- présence d'un UUID littéral ;
- indicateur `environment_specific`.

Le corps SQL n'est volontairement pas copié dans ce fichier.

### `production-schema-fingerprint-2026-10-03.json`
Empreinte structurelle de la production, sans données métier.

Elle couvre :
- tables ;
- fonctions ;
- vues ;
- politiques RLS ;
- triggers ;
- index.

Chaque objet possède une empreinte calculée depuis sa définition PostgreSQL. Cela permettra de détecter un changement live qui n'aurait pas été versionné.

### `repository-sql-artifacts.json`
Inventaire des fichiers SQL GitHub présents sur la branche Phase A avec :
- chemin ;
- taille ;
- SHA Git du blob.

## Règle A4

À partir de maintenant, une évolution de base est considérée correctement versionnée seulement si :

1. la migration existe dans Supabase ;
2. sa représentation SQL existe dans GitHub ;
3. les changements spécifiques à un compte ou à un environnement sont séparés du schéma générique ;
4. l'empreinte de production est régénérée après la modification ;
5. le registre de migrations est mis à jour ;
6. les Advisors Supabase et le contrôle d'architecture passent.

## Pourquoi le SQL historique n'est pas exporté automatiquement tel quel

Supabase conserve encore les statements exacts des 107 migrations, ce qui permet une récupération fiable.

Cependant, certaines anciennes migrations contiennent des UUID de comptes codés en dur. Les rejouer sur une nouvelle instance serait incorrect et pourrait créer des dépendances envers des identifiants propres à la production actuelle.

A4 doit donc distinguer :

- **migration de schéma reproductible** ;
- **migration de données génériques** ;
- **migration spécifique à l'environnement**.

## Prochaine étape A4

Construire la matrice de correspondance :

```text
migration Supabase
        ↓
fichier SQL GitHub
        ↓
rejouable automatiquement ?
        ↓
oui / adaptation requise / historique uniquement
```

Puis produire un ensemble ordonné de migrations de reconstruction qui puisse être testé sur une base vide hors production.

## Sécurité

Aucune donnée métier, adresse e-mail, mot de passe, token ou contenu de message n'est stocké dans les fichiers de réconciliation créés par A4.

Les empreintes MD5 servent uniquement à comparer des définitions SQL ; elles ne sont pas utilisées pour la sécurité cryptographique.

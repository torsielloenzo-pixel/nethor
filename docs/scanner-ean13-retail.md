# Nethor — Scanner EAN/GTIN de terrain

Date de revue : 2026-09-30

## Objectif

Le Scanner Nethor doit se comporter autant que possible comme un outil de magasin : acquisition rapide, tolérance à l'orientation, à la lumière et aux défauts d'impression, tout en restant conservateur sur l'identification du produit.

Principe de sécurité fonctionnelle :

1. une lecture exacte a toujours priorité ;
2. une déduction ne peut proposer qu'une fiche réellement présente dans le référentiel Nethor ;
3. une hypothèse n'est jamais validée automatiquement ;
4. une image inexploitable ne doit jamais produire un produit inventé.

## Ce qu'est réellement un EAN-13

GS1 décrit EAN-13 et UPC-A comme les symboles les plus courants pour identifier les articles de commerce. Le dernier chiffre est un chiffre de contrôle. Le lecteur le vérifie pour contrôler la composition du numéro.

Références :
- https://support.gs1.org/support/solutions/articles/43000734137-what-is-the-gs1-barcode-commonly-used-for-trade-item-identification-
- https://www.gs1.org/docs/barcodes/GS1_General_Specifications.pdf

Un symbole EAN-13 n'est pas uniquement la succession de barres. La qualité de lecture dépend notamment :
- du chiffre de contrôle ;
- du contraste barres/fond ;
- de la hauteur du symbole ;
- des zones calmes (Quiet Zones) ;
- de la taille des modules ;
- du support et de sa courbure ;
- de l'absence de plis, taches et reflets.

GS1 indique notamment, pour EAN-13, une Quiet Zone minimale de 11 modules à gauche et 7 modules à droite. Le symbole complet fait 113 modules en incluant ces zones minimales.

Références :
- https://support.gs1.org/support/solutions/articles/43000734141-what-should-i-check-to-ensure-good-quality-barcodes-
- https://www.gs1.org/docs/barcodes/GSCN-23-112-MagFactor.pdf

## Ce que font les scanners de magasin

Les lecteurs dédiés ne reposent pas sur une seule image parfaite.

Les imageurs de point de vente utilisent un capteur d'image et un moteur de décodage spécialisé. Un Zebra DS2208, par exemple, utilise un capteur 640 × 480 et lit les codes 1D/2D. Les lecteurs linéaires tels que le LI2208 mettent aussi l'accent sur la tolérance au mouvement et à l'angle.

Références :
- https://www.zebra.com/us/en/products/scanners/general-purpose-handheld-scanners/ds2200-series/ds2208.html
- https://www.zebra.com/us/en/products/spec-sheets/scanners/general-purpose-scanners/li2208.html

Les moteurs professionnels exposent plusieurs idées utiles à transposer :
- tolérance au mouvement ;
- lecture inverse ;
- niveaux de tolérance aux Quiet Zones réduites ;
- lecture continue ;
- adaptation entre angle de lecture large et étroit ;
- limitation des symbologies pour réduire les faux positifs et le temps de décodage.

Zebra avertit qu'un décodage plus agressif des codes sans marge augmente le temps de décodage et le risque d'erreur. Nethor applique donc les passes agressives seulement après l'échec des passes rapides.

Références :
- https://techdocs.zebra.com/datawedge/latest/guide/input/barcode/
- https://techdocs.zebra.com/datawedge/6-3/guide/decoders/
- https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/ds4608-prg-en.pdf

## Architecture Nethor

### 1. Voie rapide

Le flux principal reste volontairement limité aux formats de vente les plus utiles :
- EAN-13 ;
- EAN-8 ;
- UPC-A ;
- UPC-E ;
- ITF lorsque nécessaire.

La caméra arrière est demandée avec une définition idéale de 1280 × 720 et 30 images/s. Le décodeur principal analyse jusqu'à 24 images/s.

Le but est de ne pas lancer immédiatement toutes les analyses coûteuses.

### 2. Mise au point et exposition

Quand le navigateur et le téléphone l'autorisent :
- autofocus continu ;
- exposition continue ;
- balance des blancs continue.

Une lampe est proposée si le flux caméra expose la capacité « torch ». Elle reste manuelle : sur un emballage brillant, allumer la lampe peut au contraire augmenter le reflet.

### 3. Quatre orientations

La voie assistée analyse successivement :
- 0° ;
- 180° ;
- 90° ;
- 270°.

L'ordre est adapté localement selon les orientations qui ont déjà réussi sur l'appareil.

Deux moteurs peuvent participer :
- BarcodeDetector natif lorsqu'il existe ;
- ZXing comme décodeur indépendant de secours.

ZXing est configuré avec TRY_HARDER et, si la version disponible le permet, ALSO_INVERTED.

Références :
- https://github.com/zxing-js/library
- https://zxing.github.io/zxing/apidocs/com/google/zxing/DecodeHintType.html

### 4. Analyse large / rapprochée

Les scanners professionnels peuvent modifier leur angle de lecture. Nethor reproduit l'idée en alternant :
- image complète ;
- crop central agrandi.

Cela permet de conserver une grande zone d'acquisition tout en augmentant périodiquement le nombre de pixels disponibles par barre lorsqu'un code est petit dans l'image.

### 5. Contraste, éclairage et reflet

Les passes sont progressives :

1. image normale ;
2. correction automatique du contraste ;
3. ajout artificiel d'une marge blanche pour aider les codes dont la Quiet Zone est coupée ;
4. binarisation noir/blanc sur les cas persistants.

Ces traitements ne tournent pas tous à chaque image afin de préserver les performances du téléphone.

### 6. Validation GS1

Nethor sait calculer et vérifier le chiffre de contrôle GTIN pour les longueurs 8, 12, 13 et 14.

La base contient aussi des identifiants internes historiques sur 13 chiffres qui ne sont pas tous des GTIN GS1 valides. Le Scanner ne doit donc pas supprimer ces identifiants, mais il utilise la validation GS1 comme information supplémentaire pour les codes commerciaux.

### 7. Normalisation GTIN

Un UPC-A de 12 chiffres peut être représenté sous forme GTIN-13 avec un zéro initial. Le Scanner génère les variantes canoniques nécessaires avant la recherche, sans modifier la valeur stockée.

Il peut également calculer un chiffre de contrôle lorsque la séquence reçue correspond clairement au corps d'un GTIN incomplet.

### 8. Déduction contrôlée

Si aucune correspondance exacte n'est trouvée, la fonction serveur `scan_product_hypotheses` compare uniquement la séquence observée aux fiches actives de Nethor.

Les cas actuellement pris en compte incluent :
- un chiffre différent ;
- un chiffre manquant ou supplémentaire ;
- deux chiffres différents avec score réduit ;
- une longue sous-séquence concordante ;
- un préfixe ou suffixe suffisamment long.

Les résultats sont affichés avec un **score de concordance**, jamais comme une probabilité certaine.

L'utilisateur doit confirmer une hypothèse.

## Pourquoi nous ne « devinons » pas davantage

Un EAN physiquement très détruit peut ne fournir aucun chiffre au décodeur. À ce stade, déduire un produit sans autre information reviendrait à inventer.

Les prochaines améliorations admissibles doivent donc apporter une nouvelle observation objective, par exemple :
- décodage structurel direct des 95 modules EAN-13 ;
- exploitation des chiffres lisibles sous les barres ;
- redressement d'un symbole cylindrique ;
- fusion de plusieurs lectures partielles consécutives ;
- validation par plusieurs images avant de proposer une hypothèse faible.

## Matrice de tests terrain

Chaque version Scanner doit être testée au minimum avec :

| Cas | Attendu |
| --- | --- |
| EAN horizontal | lecture immédiate |
| EAN horizontal retourné | lecture |
| EAN vertical | lecture |
| EAN vertical retourné | lecture |
| faible lumière | lecture ou proposition de lampe |
| forte lumière | pas de faux positif |
| emballage brillant | essai sans lampe puis avec lampe |
| petite taille / éloigné | passage vue large → crop rapproché |
| code très proche | autofocus puis lecture |
| Quiet Zone partiellement coupée | passe agressive seulement après échec |
| code légèrement froissé | contraste + multi-orientation |
| code cylindrique | meilleure lecture possible, sans garantie |
| 1 chiffre mal lu | hypothèse confirmable |
| séquence partielle | hypothèse uniquement si suffisamment discriminante |
| aucune information exploitable | aucun produit proposé |

## Critère de réussite

Un Scanner « utilisable en magasin » n'est pas celui qui tente le plus de traitements. C'est celui qui :
- trouve rapidement le cas normal ;
- augmente progressivement l'effort uniquement en cas d'échec ;
- ne bloque pas l'interface ;
- garde une acquisition continue ;
- ne transforme jamais une supposition en résultat certain.

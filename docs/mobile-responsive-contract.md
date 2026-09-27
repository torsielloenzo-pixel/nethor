# Contrat responsive mobile — Nethor

Toute nouvelle interface ou modification mobile doit respecter ces règles avant fusion.

- Tester au minimum les largeurs CSS 320, 360, 375, 390, 412, 430, 600 et 900 px.
- Vérifier portrait **et** paysage, avec iOS Safari/PWA et Chrome Android comme cas de référence.
- Ne jamais superposer une navigation persistante au contenu suivant sans réserver explicitement sa hauteur.
- Préférer le flux normal (`position: relative/static`) pour les commandes de page. Réserver `fixed/sticky` aux éléments réellement persistants.
- Utiliser `min-width:0`, `max-width:100%`, `box-sizing:border-box`, `clamp()`, `min()` et les grilles `minmax(0,1fr)` pour éviter les débordements.
- Tenir compte de `env(safe-area-inset-*)` pour les appareils avec encoche / Dynamic Island / zones système.
- Pour la hauteur d’écran, préférer `dvh` avec une solution de repli raisonnable; éviter les hauteurs fixes pour le contenu.
- Les listes horizontales doivent défiler explicitement et ne jamais agrandir la page.
- Aucun texte ne doit sortir d’une carte: prévoir retour à la ligne, `overflow-wrap:anywhere` ou ellipsis selon le contexte.
- Les cibles tactiles importantes doivent viser environ 44 px minimum.
- Avant publication, vérifier qu’aucun menu, modal, feuille, barre haute ou barre basse ne masque le premier ou dernier contenu interactif.

Le planning mobile suit en plus l’ordre visuel: navigation de vue → jours → détail du jour → horaires → widgets → historique.

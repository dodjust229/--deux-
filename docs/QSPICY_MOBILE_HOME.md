# QSPICY — accueil responsive mobile

## Symptôme signalé

Sur téléphone, l'utilisateur devait activer le mode « site pour ordinateur » du navigateur
pour obtenir un affichage acceptable. Le défaut se voyait d'abord sur l'accueil : le même
visuel de bureau était servi sur téléphone et recadré avec `object-fit: cover`, ce qui
coupait une partie du couple et plaçait le texte sur l'image.

## Correction

- `Home.tsx` sert maintenant les compositions déjà présentes dans `public/brand` :
  - téléphone : `accueil-mobile.webp` (1080 × 1440) ;
  - tablette : `accueil-tablette.webp` (1280 × 960) ;
  - bureau : `accueil-bureau.webp` (1600 × 900).
- Sur téléphone, l'image est un bloc portrait distinct en haut de l'écran.
- Le texte, les actions et l'invitation sont dans un panneau bordeaux séparé sous l'image :
  le texte ne recouvre plus le couple.
- Le bouton d'entrée reste dans la zone visible sur les petites hauteurs courantes.
- Le layout peut défiler verticalement si nécessaire ; il ne dépend pas du mode ordinateur.

## Recette navigateur

Playwright vérifie 360×640, 390×844, 768×1024 et 1365×900 :
- bonne source image selon le breakpoint ;
- image et panneau de texte réellement séparés ;
- bouton dans les limites du panneau ;
- absence de débordement horizontal ;
- bouton d'entrée visible sur les deux formats téléphone.

## Limites

- Aucun changement du logo officiel.
- Aucun changement de Supabase.
- Aucun déploiement Render ou GitHub Pages.

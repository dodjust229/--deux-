# QSPICY — présence du logo sur l'accueil

## Symptôme signalé

Le logo officiel était devenu « insignifiant » : il était traité comme une petite icône de
navigation, perdu dans l'espace supérieur. Dans la première maquette, le nom QSPICY devait
être immédiatement identifiable, avec la couronne, le piment et le lettrage doré visibles.

## Correction

- L'image officielle `public/brand/logo-qspicy.webp` est conservée sans redessin ni recadrage.
- Sur l'accueil, le logo passe à 112 px sur bureau/tablette et 96 px sur téléphone.
- La barre haute et le décalage du hero sont recalés pour laisser respirer la marque sans
  couvrir le contenu.
- Les autres écrans conservent leur taille de logo compacte.

## Recette

Playwright mesure le logo sur 360×640, 390×844, 768×1024 et 1365×900 et vérifie :
- l'asset officiel est bien affiché ;
- la taille correspond au breakpoint ;
- aucun débordement horizontal ;
- l'accueil mobile garde le bouton d'entrée visible.

## Limites

- Le fichier du logo n'est pas modifié.
- Aucun changement Supabase.
- Aucun déploiement Render ou GitHub Pages.

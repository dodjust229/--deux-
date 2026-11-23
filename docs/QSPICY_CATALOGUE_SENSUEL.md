# QSPICY — Catalogue sensuel et fonds animés (livraison Claude)

Branche : `qspicy/catalogue-sensuel` · Base : `qspicy/duos-lifecycle` · Date : 2026-11-23

## Origine

Lot produit par Claude (contenu, composant, styles, audit), intégré ici par Spark sans réécriture
du contenu ni des styles. Seul le point de montage du composant a été changé, pour la raison
technique décrite plus bas.

## Ce qui est intégré

| Élément | Contenu |
|---|---|
| `src/catalog.json` | 49 cartes (43 conservées à l'identique sur leurs identifiants, 6 nouvelles `a05` à `a10`, 41 textes réécrits en registre sensuel). Paliers : 1 → 9, 2 → 22, 3 → 10, 4 → 8. |
| `supabase/02_catalog.sql` | régénéré, cohérent avec le catalogue (`node scripts/sync-catalog.mjs --check` passe). |
| `src/components/SalonAmbiance.tsx` | fond animé du salon, piloté par le palier réel (`level`), avec états `paused` et `waiting`. |
| `src/styles/salons.css` | styles et animations des six salons, CSS et SVG natifs, `transform` et `opacity` uniquement. |
| `src/styles/index.css` | import de `salons.css`. |
| `src/App.tsx` | montage unique du fond à la racine de l'application, et seulement pendant une salle (pas sur l'accueil ni les écrans de choix). |

## Décision d'intégration : montage à la racine

La consigne de livraison proposait d'insérer `<SalonAmbiance />` dans `Game.tsx` et `DuoGame`, juste
après `<Atmosphere />`. Testé : **le fond se rogne aux bords du conteneur**. Les écrans portent
l'animation `page-in` (`transform: translateY`), et un `transform` sur un ancêtre fait de lui le bloc
conteneur d'un descendant `position: fixed` ; le calque ne couvre donc plus la fenêtre et laisse des
bandes visibles sur les côtés.

Le composant est donc monté **une seule fois dans App.tsx**, hors des écrans animés. Vérifié à l'écran :
le fond couvre toute la fenêtre, sans bande.

## À trancher avant mise en production

1. **Doublon de fond.** `Atmosphere` (canvas, animation de particules) reste en place dans les écrans.
   Deux couches décoratives se superposent. Choix : garder `SalonAmbiance` seul et retirer
   `Atmosphere`, ou réserver `SalonAmbiance` aux moments forts (transition de palier, révélation).
2. **Rendu trop sombre au palier 1.** À la racine, le calque assombrit l'écran et masque le dégradé
   bordeaux actuel. Le réglage des opacités (variables `--glow`, `--veil`, `--lamp-*`) revient à Claude.
3. **Contenu — palier 4.** ~~`a07`, `a08` et `a10` sans rappel de consentement.~~ **Corrigé** : une
   phrase de rappel a été ajoutée aux trois cartes (voir plus bas). L'auteur du contenu peut reformuler.
4. **Application du catalogue à Supabase.** `02_catalog.sql` commence par `truncate public.catalog`.
   Aucune clé étrangère ne pointe vers cette table et les 43 identifiants existants sont conservés :
   aucune donnée de jeu n'est perdue. À exécuter hors partie en cours, et seulement sur décision du
   propriétaire. Sans cette étape, le serveur ne connaît pas les six nouvelles cartes.
5. **Volume.** 49 cartes restent courtes pour un abonnement ; l'audit de Claude vise 150 à 200 cartes.

## Correctifs appliqués après vérification (2026-11-23)

- **Rappel de consentement** ajouté sur `a07`, `a08` et `a10` : le cahier l'exige sur chaque carte de
  palier 4. Formulations ajoutées : « Chacun peut s'arrêter sans se justifier, à tout moment. »,
  « Une envie, pas une promesse : l'autre reste libre de la refuser. », « Rien de tout cela n'engage
  l'autre. »
- **Fond limité aux salles** : monté à la racine mais rendu seulement quand une partie est chargée,
  pour ne pas modifier l'accueil et les écrans de choix.
- **Recette enrichie** : un quatrième bloc vérifie le parcours 18+ — refus du lancement avec un seul
  accord, 10 cartes `audacieux` toutes présentes côté serveur, option scellée inconnue refusée,
  option du catalogue acceptée.

## Corrections à porter dans l'audit d'origine

`QSPICY_AUDIT_ET_PLAN.md` affirme que « les réponses privées sont gardées dans le stockage local du
navigateur ». C'est inexact : les réponses sont en base Supabase, seule l'identité de session est
locale (`adeux_identity` + cookie). À corriger pour ne pas construire la suite sur une fausse prémisse.

## Vérifications exécutées (2026-11-23)

- `node scripts/sync-catalog.mjs --check` : catalogue et SQL cohérents, 49 interactions.
- `npm test` : 21/21, catalogue et pilote éditorial valides.
- `npm run typecheck` et `npm run build` : OK.
- Contrôle visuel du fond monté à la racine, en aperçu de développement, dans Chrome.

Rien n'a été exécuté sur Supabase. Aucun déploiement.

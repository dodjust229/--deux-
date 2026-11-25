# QSPICY — audit technique des champs level et intensity

Date : 24 novembre 2026  
Branche d'intégration : `integrate/qspicy-master-catalogue-v2` (PR #33).

## 1. Dépendances confirmées

Le champ actuel `level` est un champ technique de bout en bout, pas une simple étiquette éditoriale.

| Fichier / zone | Usage observé |
|---|---|
| `src/catalog.json` | Chaque carte possède un `level` technique 1–4 et une `intensity` éditoriale 1–5. |
| `src/types.ts` | `Interaction.level` reste limité à 1–4 ; `Interaction.intensity` vaut 1–5. Les niveaux de salle et de session restent techniques. |
| `src/content.ts` | Le JSON du catalogue est importé comme source de contenu et typé en `Interaction[]`. |
| `src/api.ts` | Le démarrage d'une partie transmet le niveau sélectionné aux RPC Supabase. |
| `src/screens/Game.tsx` | L'intensité éditoriale pilote désormais l'étiquette affichée sur la carte ; le rideau de transition conserve le niveau technique. |
| `src/components/LevelCurtain.tsx` | Le niveau 1–4 pilote la transition visuelle entre paliers. |
| `supabase/02_catalog.sql` | Le catalogue initial persiste `level` et `intensity`. Le fichier est généré, ne doit pas être modifié à la main. |
| `supabase/11_game_levels.sql`, `12_level_consent_guard.sql` | Les RPC filtrent les cartes en fonction du niveau technique. |
| `supabase/20_level_and_mode_integrity.sql` | Le moteur de session s'appuie sur `level` pour l'ordre et la sélection des cartes. |
| `supabase/21_explicit_content_floor.sql` | Le niveau sert aussi au calcul du plancher de contenu explicite et aux contrôles de session. |
| `scripts/sync-catalog.mjs` | Le script vérifie `level` 1–4 et `intensity` 1–5, sans imposer 48 cartes par niveau ; il génère le SQL initial et la migration 22. |

## 2. Décision d'architecture appliquée

`level` reste le niveau technique 1–4 utilisé par les RPC et la progression. Il n'a pas été renommé ni converti.

`intensity: 1 | 2 | 3 | 4 | 5` est un champ distinct, désormais persisté dans le catalogue SQL. Les cinq intensités sont affichées sur les cartes. Les contrôles 18+ du mode Personnalisé se basent sur cette intensité. La classification 3–5 correspond aux cartes techniques de niveau 3–4 dans le master V2.

La contrainte artificielle de 48 cartes par niveau a été retirée ; les nouvelles répartitions sont vérifiées explicitement dans la recette PostgreSQL.

## 3. Travaux d'intégration réalisés dans la PR #33

- Migration SQL additive pour ajouter et contraindre `intensity` sans toucher à `level`.
- Mise à jour du générateur `catalog:sync` et des deux fichiers SQL générés.
- Mise à jour des types TypeScript et des interfaces de contenu.
- Affichage des cinq intensités en Couple, DUOS et Personnalisé.
- Mise à jour des contrôles 18+ du mode Personnalisé.
- Mise à jour de la recette PostgreSQL pour vérifier les 220 cartes, les répartitions et la cohérence de `explicit_rank`.

## 4. État actuel

L'intégration est proposée dans la PR #33. La CI doit confirmer le typecheck, les tests, le build et la recette PostgreSQL. La migration 22 reste à exécuter dans Supabase par le propriétaire avant déploiement. Aucune base de production n'a été modifiée et aucun déploiement n'a été effectué.

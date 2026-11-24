# QSPICY — audit technique du champ level et de la future intensity

Date : 24 novembre 2026  
Branche de travail : `docs/qspicy-catalogue-hot-direction`  
Code audité : branche `main`, sans modification.

## 1. Dépendances confirmées

Le champ actuel `level` est un champ technique de bout en bout, pas une simple étiquette éditoriale.

| Fichier / zone | Usage observé |
|---|---|
| `src/catalog.json` | Chaque carte possède un `level` compris entre 1 et 4. |
| `src/types.ts` | Le type `Interaction.level` est limité à `1 | 2 | 3 | 4`. Les niveaux de salle et de session utilisent également cette plage. |
| `src/content.ts` | Le JSON du catalogue est importé comme source de contenu et typé en `Interaction[]`. |
| `src/api.ts` | Le démarrage d'une partie transmet le niveau sélectionné aux RPC Supabase. |
| `src/screens/Game.tsx` | Le niveau pilote les étiquettes, la présentation de la carte et les attributs visuels. |
| `src/components/LevelCurtain.tsx` | Le niveau 1–4 pilote la transition visuelle entre paliers. |
| `supabase/02_catalog.sql` | Le catalogue SQL persiste le champ `level`. Le fichier est généré, ne doit pas être modifié à la main. |
| `supabase/11_game_levels.sql`, `12_level_consent_guard.sql` | Les RPC filtrent les cartes en fonction du niveau technique. |
| `supabase/20_level_and_mode_integrity.sql` | Le moteur de session s'appuie sur `level` pour l'ordre et la sélection des cartes. |
| `supabase/21_explicit_content_floor.sql` | Le niveau sert aussi au calcul du plancher de contenu explicite et aux contrôles de session. |
| `scripts/sync-catalog.mjs` | Le script vérifie les niveaux 1–4, exige exactement 48 cartes par niveau et génère le SQL du catalogue. |

## 2. Conséquence

**Il ne faut surtout pas remplacer, renommer ou convertir `level` en 1–5.** Cela casserait les types, les RPC, les règles de sélection, les tests et la synchronisation SQL.

La classification demandée doit rester un champ éditorial distinct, par exemple `intensity: 1 | 2 | 3 | 4 | 5`.

À ce stade, ajouter `intensity` dans un document JSON de brouillon est sans effet sur le jeu. L'ajouter uniquement à `src/catalog.json` ne suffirait pas à la rendre disponible en base : le script actuel ne génère que les colonnes `id, category, kind, options, level`, et la table SQL n'a pas encore été étendue pour ce champ.

## 3. Travaux nécessaires avant un usage dans l'application

Si la classification éditoriale doit ensuite piloter les filtres du jeu, il faudra préparer une PR applicative distincte avec :
1. une migration SQL additive pour ajouter et contraindre `intensity` sans toucher à `level` ;
2. une mise à jour du script `catalog:sync` et du SQL généré ;
3. une mise à jour des types TypeScript et des interfaces de lecture ;
4. une décision explicite sur la différence entre le niveau technique de progression et l'intensité éditoriale ;
5. des tests de compatibilité des RPC, du tirage, des niveaux explicites, des salons À Deux, DUOS et Personnalisé ;
6. une migration et un déploiement seulement après revue et autorisation.

## 4. Décision actuelle

Le travail en cours reste éditorial et documentaire. Aucun champ n'est ajouté à la base, aucune migration n'est créée, aucune RPC n'est modifiée et aucun déploiement n'est effectué. Le catalogue actif reste inchangé.

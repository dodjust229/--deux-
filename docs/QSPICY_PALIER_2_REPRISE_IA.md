# QSPICY — dossier de reprise IA · Palier 2

Date : 24 novembre 2026  
Palier 2 terminé et fusionné dans `main` par les PR #17 et #18.  
Commit de livraison : `d0185ec34fcd1a76fd19b5dcc2f9eab1ec81b5a9`.  
État : migrations 14 et 15 appliquées en production ; catalogue et moteur anti-répétition vérifiés ; CI verte ; déploiement Render `dep-dc2kqbcs728c73atac50` au statut `live`.

## Objectif du palier 2

- Revenir dans une salle active doit reprendre exactement la partie en cours : même paquet, même question, même index.
- Après la fin d'une partie, lancer une nouvelle partie dans la même salle doit tirer des cartes non encore jouées.
- Couple et DUOS doivent appliquer la même règle.
- Une fois toutes les cartes du pool choisi (palier + catégories communes) consommées, seul ce pool est remis à zéro. L'historique des autres paliers/catégories reste intact.
- L'historique est attaché à la salle. Créer une nouvelle salle démarre un historique vierge.

## Modifications livrées

1. `supabase/14_session_question_history.sql`
   - Ajoute `rooms.played_interaction_ids text[] not null default '{}'`.
   - Remplace `start_game_by_level` et `start_duo_game_by_level`.
   - Chaque lancement filtre les cartes déjà jouées dans cette salle.
   - Les identifiants du nouveau paquet sont enregistrés immédiatement au lancement.
   - Si le pool correspondant au palier et aux catégories communes est épuisé, l'historique de ce seul pool est libéré puis le tirage recommence.
   - Les droits restent limités à `anon`, comme les fonctions existantes ; `public` et `authenticated` sont révoqués.

2. `supabase/tests/level_engine.sql`
   - Ajoute des tests d'intégration Couple et DUOS : deux sessions complètes de 24 cartes sans recouvrement, le reliquat de deux cartes, puis renouvellement après épuisement.
   - Les cartes temporaires `t98` et `t99` sont supprimées à la fin du test.

3. `supabase/tests/run_postgres.sh`
   - Ajoute les migrations 14 et 15 à la chaîne de recette.

4. `src/screens/End.tsx`
   - Le bouton devient « Nouvelle partie ».
   - L'écran précise que les cartes déjà jouées sont mises de côté.

5. `supabase/README.md`
   - Documente l'ordre des migrations et les 48 cartes par palier.

6. `src/catalog.json` + `supabase/02_catalog.sql`
   - Catalogue de production : 192 cartes, soit 48 par palier ; le SQL généré est synchronisé.

7. `supabase/15_expand_session_catalog.sql`
   - UPSERT des métadonnées des 96 nouvelles cartes ; aucun TRUNCATE ni effacement.

## Point de reprise important — volume du catalogue

Le catalogue est maintenant étendu à **192 cartes, soit 48 par palier**. Une session de 24 questions peut être suivie d'une deuxième session complète sans répétition si les catégories communes couvrent tout le pool du palier. Si les joueurs ne sélectionnent qu'une partie des catégories, la taille du pool éligible varie et le cycle peut s'épuiser plus tôt.

## Vérifications exécutées

Commandes exécutées par la CI GitHub sur la PR #18 :

```bash
npm ci
npm test
npm run build
bash supabase/tests/run_postgres.sh
```

La CI a confirmé :
- aucun identifiant commun entre deux paquets successifs tant que le pool contient des cartes inédites ;
- remise à zéro limitée au palier et aux catégories épuisés ;
- fonctionnement identique pour Couple et DUOS ;
- conservation du consentement et du filtrage par niveau ;
- reconnexion à une session en cours sans nouveau tirage.

La recette PostgreSQL 16 applique bien les migrations 14 et 15, puis vérifie le catalogue équilibré et deux sessions complètes sans répétition en Couple et DUOS.

## Déploiement / base de production

**Déploiement effectué.** Les migrations 14 et 15 ont été appliquées au projet Supabase `xqvxorvvjmwzpcqmqnqv`. Vérifications SQL : 192 cartes uniques, 48 cartes par palier, 96 nouvelles cartes insérées. Les deux RPC de lancement restent exécutables par `anon` uniquement ; `authenticated` et `public` n'ont pas le droit `EXECUTE`.

Render : service `a-deux-jeu`, déploiement `dep-dc2kqbcs728c73atac50`, commit `d0185ec34fcd1a76fd19b5dcc2f9eab1ec81b5a9`, statut `live`. Le build `npm ci --no-audit --no-fund && npm run build` a réussi. Le service compile directement le dépôt ; il n'a pas besoin de régénérer `a-deux-source.tar.gz`.

## Ne pas faire

- Ne pas effacer `played_interaction_ids` dans `restart_game` ou `restart_duo_game` : cela réintroduirait les répétitions.
- Ne pas remplacer le paquet en cours lors d'une reconnexion : `interaction_ids` + `current_index` sont la source de vérité.
- Ne pas remettre à zéro tout l'historique quand un seul palier/catégorie est épuisé.
- Garder le catalogue source `src/catalog.json` et le SQL `supabase/02_catalog.sql` synchronisés avec `npm run catalog:sync`.

## État technique connu

Les migrations sont additives et non destructives : elles conservent les salles, réponses et historiques existants. La recette utilise une base PostgreSQL jetable. Le contrôle final de production a vérifié le schéma, le volume du catalogue et les privilèges RPC ; il n'a pas simulé une vraie partie avec deux navigateurs. Une vérification fonctionnelle manuelle Couple et DUOS reste utile après la livraison.

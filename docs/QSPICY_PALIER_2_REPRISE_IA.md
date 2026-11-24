# QSPICY — dossier de reprise IA · Palier 2

Date : 24 novembre 2026  
Travail historique fusionné par la PR #17 ; extension du catalogue préparée sur `qspicy/palier-2-catalog-expansion`.  
Base : `main` après la PR #17.  
État : moteur d'historique fusionné et migration 14 appliquée en production ; migration 15 + catalogue 192 cartes en attente de CI, fusion et application.

## Objectif du palier 2

- Revenir dans une salle active doit reprendre exactement la partie en cours : même paquet, même question, même index.
- Après la fin d'une partie, lancer une nouvelle partie dans la même salle doit tirer des cartes non encore jouées.
- Couple et DUOS doivent appliquer la même règle.
- Une fois toutes les cartes du pool choisi (palier + catégories communes) consommées, seul ce pool est remis à zéro. L'historique des autres paliers/catégories reste intact.
- L'historique est attaché à la salle. Créer une nouvelle salle démarre un historique vierge.

## Modifications préparées sur cette branche

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
   - Catalogue étendu à 192 cartes, soit 48 par palier ; le SQL généré est synchronisé.

7. `supabase/15_expand_session_catalog.sql`
   - UPSERT des métadonnées des 96 nouvelles cartes ; aucun TRUNCATE ni effacement.

## Point de reprise important — volume du catalogue

Le catalogue est maintenant étendu à **192 cartes, soit 48 par palier**. Une session de 24 questions peut être suivie d'une deuxième session complète sans répétition si les catégories communes couvrent tout le pool du palier. Si les joueurs ne sélectionnent qu'une partie des catégories, la taille du pool éligible varie et le cycle peut s'épuiser plus tôt.

## Vérifications à effectuer avant fusion

Depuis une copie fraîche de la branche `qspicy/palier-2-catalog-expansion` :

```bash
npm ci
npm test
npm run build
bash supabase/tests/run_postgres.sh
```

La recette SQL doit confirmer :
- aucun identifiant commun entre deux paquets successifs tant que le pool contient des cartes inédites ;
- remise à zéro limitée au palier et aux catégories épuisés ;
- fonctionnement identique pour Couple et DUOS ;
- conservation du consentement et du filtrage par niveau ;
- reconnexion à une session en cours sans nouveau tirage.

Vérifier aussi que `supabase/tests/run_postgres.sh` applique bien `14_session_question_history.sql` puis `15_expand_session_catalog.sql` après les migrations 11 à 13.

## Déploiement / base de production

**Le moteur d'historique est déjà en production.** La migration 14 a été appliquée et vérifiée sur Supabase. L'extension du catalogue (migration 15 + 96 nouvelles cartes) n'est pas encore fusionnée ni appliquée. Aucun déploiement de cette extension n'a été confirmé.

Après CI verte et revue du diff :
1. obtenir une CI verte, puis fusionner la PR catalogue dans `main` ;
2. appliquer `15_expand_session_catalog.sql` une seule fois sur le projet Supabase `xqvxorvvjmwzpcqmqnqv` (la migration 14 est déjà appliquée) ;
3. vérifier 192 cartes, 48 par palier, et les grants des RPC ;
4. laisser Render déployer le commit `main` (le service compile directement le dépôt avec `npm ci && npm run build`) ;
5. vérifier le déploiement `live`, puis une reconnexion et deux sessions de 24 questions sans recouvrement dans la même salle.

## Ne pas faire

- Ne pas effacer `played_interaction_ids` dans `restart_game` ou `restart_duo_game` : cela réintroduirait les répétitions.
- Ne pas remplacer le paquet en cours lors d'une reconnexion : `interaction_ids` + `current_index` sont la source de vérité.
- Ne pas remettre à zéro tout l'historique quand un seul palier/catégorie est épuisé.
- Garder le catalogue source `src/catalog.json` et le SQL `supabase/02_catalog.sql` synchronisés avec `npm run catalog:sync`.

## État technique connu

La migration conserve les réponses, salles et données existantes. Elle n'effectue aucune suppression de données utilisateur. Les tests ajoutés sont des tests de base jetable, pas une partie réelle créée en production.

# Migrations Supabase — QSPICY

Les fichiers SQL de ce dossier sont la seule source de vérité du schéma. Ils s'appliquent **dans l'ordre**,
dans l'éditeur SQL du projet `xqvxorvvjmwzpcqmqnqv` ou via `psql`.

| Fichier | Contenu | Remarque |
|---|---|---|
| `01_schema.sql` | mode deux joueurs : tables, RLS, RPC, droits | à exécuter en premier |
| `02_catalog.sql` | catalogue des 192 interactions (48 par palier) | TRUNCATE puis insert |
| `03_reconnexion_securisee.sql` | reprise de place par jeton uniquement | remplace `join_room` |
| `04_duo_consent_default_off.sql` | correctif historique DUOS | **obsolète** : voir ci-dessous |
| `05_duo_rpc_anon_only.sql` | correctif historique des droits | **obsolète** : repris par `06` |
| `06_duo_schema.sql` | schéma DUOS complet versionné : `rooms.mode`, `players.duo_no`, tables `duo_*`, RLS, 8 RPC, droits `anon` | rend le mode DUOS reproductible |
| `07_security_fixes.sql` | médias désactivés par défaut, réponses DUOS masquées avant révélation, cloisonnement des modes | sécurité et consentement |
| `08_duo_lifecycle.sql` | première version du redémarrage DUOS | remplacée par `09` |
| `09_duo_replay.sql` | revanche DUOS : vote des quatre joueurs, `players.replay_vote` | remplace `restart_duo_game` |

## Installation neuve

```
01_schema.sql
02_catalog.sql
03_reconnexion_securisee.sql
06_duo_schema.sql
07_security_fixes.sql
09_duo_replay.sql
```

`04` et `05` ne sont plus nécessaires sur une base neuve : leur intention est reprise par `06`.
`04` réécrivait des fonctions par remplacement de texte (`replace(pg_get_functiondef(...))`), ce qui
échoue silencieusement dès que le formatage diffère. `08` est conservé pour l'historique ; `09` le remplace.

## Base existante

```
07_security_fixes.sql
09_duo_replay.sql
```

`06` peut être rejoué sans risque sur une base existante (tout est `if not exists` / `create or replace`),
mais il n'est pas nécessaire si les tables `duo_*` sont déjà là.

## Recette locale (obligatoire avant toute mise en production)

`supabase/tests/recette_locale.sql` rejoue la chaîne sur une base vierge et vérifie les parcours :

```bash
createdb qspicy_test
for f in 01_schema 02_catalog 03_reconnexion_securisee 06_duo_schema 07_security_fixes 09_duo_replay; do
  psql -d qspicy_test -v ON_ERROR_STOP=1 -f "supabase/$f.sql"
done
psql -d qspicy_test -v ON_ERROR_STOP=1 -f supabase/tests/recette_locale.sql   # doit finir par RECETTE OK
```

Couvert : création et jonction DUOS, consentement 18+, masquage des réponses avant révélation,
révocation des autorisations en cours de partie (espace commun, médias), avancée à quatre,
cloisonnement des modes, revanche à quatre accords, parcours deux joueurs.

**Jamais sur la base de production** : la recette crée des salles et écrit des réponses.


## Palier 1 — moteur de niveaux

Après les migrations existantes, appliquer `11_game_levels.sql`, puis `12_level_consent_guard.sql` et `13_expand_balanced_catalog.sql`. Elles ajoutent les paliers au catalogue et aux salles, synchronisent les cartes sans vider la table, filtrent les cartes côté serveur et arrêtent une partie de palier 3–4 si un consentement 18+ est retiré. Elles sont additives et conservent les salles/réponses existantes.


## Palier 2 — sessions et historique anti-répétition

Après le palier 1, appliquer `14_session_question_history.sql`. La colonne
`rooms.played_interaction_ids` conserve les identifiants déjà joués dans la salle.
Chaque nouvelle partie filtre les cartes déjà consommées, pour Couple comme pour DUOS.
Quand tout le pool correspondant au palier et aux catégories communes est épuisé,
un nouveau cycle repart automatiquement. La reprise d'une partie en cours ne modifie
ni l'ordre ni l'index : elle recharge toujours `rooms.interaction_ids` et
`rooms.current_index`.

La migration est additive et ne supprime aucune donnée. La recette locale couvre
deux sessions successives sans recouvrement, puis la remise à zéro du cycle après
épuisement du pool, dans les deux modes.

Le catalogue compte maintenant 48 cartes par palier. Avec une sélection couvrant tout
le pool du palier, deux sessions complètes de 24 questions peuvent être jouées sans
répétition. Si les catégories communes ne couvrent qu'une partie du pool, le nombre
de sessions inédites dépend du nombre de cartes restantes dans ces catégories.


### Extension du catalogue — 48 cartes par palier

Appliquer ensuite `15_expand_session_catalog.sql`. Le catalogue passe à 192 cartes
(48 par palier). Une session de 24 questions peut ainsi être suivie d'une deuxième
session complète sans aucune répétition, tant que les joueurs conservent un ensemble
de catégories qui couvre le pool correspondant. La migration 15 est un UPSERT non
destructif ; les textes, titres et formulations complets sont dans `src/catalog.json`.

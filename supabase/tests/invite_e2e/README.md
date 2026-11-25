# Recette d'invitation — salon Personnalisé (base Supabase de test)

Vérifie le seul chemin d'entrée réel d'une partie : **le lien d'invitation**. L'hôte compose
une sélection Personnalisée, l'invité ouvre le lien dans un autre navigateur, et les deux
jouent la même séquence dans le même ordre.

Rien n'est simulé : le front compilé parle à une vraie base PostgreSQL par un vrai PostgREST,
avec les migrations du dépôt, jusqu'au catalogue V2 et au correctif QCM. Ni la production, ni `main` ne sont touchées.

## Lancer

```bash
bash supabase/tests/invite_e2e/run.sh
```

Prérequis : PostgreSQL 16 local, node/npm, `google-chrome`, `curl`, `python3`.

Le script, à chaque exécution :

1. télécharge PostgREST 16.6 dans `/tmp/qspicy-invite-e2e` (une fois) ;
2. recrée la base jetable `qspicy_invite_e2e` et applique les migrations dans l'ordre de
   `supabase/tests/run_postgres.sh` (01 → 19) ;
3. démarre PostgREST puis le front compilé, tous deux sur `127.0.0.1` ;
4. joue les recettes dans des navigateurs isolés et affiche `n/n vérifications réussies`.

Aucun adaptateur de test n'est appliqué : `join_room_any` est versionné par
`19_invitation_finalisation.sql`, donc la base de recette est exactement celle que produirait
le dépôt seul.

Variables utiles : `TEST_DB`, `PGRST_PORT` (3199), `APP_PORT` (5299), `CHROME_PATH`.

## Ce qui est vérifié

| # | Vérification |
|---|--------------|
| I01 | le lien porte l'identifiant du salon et `mode=custom` |
| I02 | le lien ouvre directement l'écran d'entrée de l'invité |
| I03 | l'invité arrive dans le panneau Personnalisé, pas dans le lobby catalogue |
| I04 | l'invité ne voit aucun bouton de lancement catalogue |
| I05 | l'hôte voit les deux joueurs dans le salon |
| I06 | la sélection composée par l'hôte compte 5 cartes |
| I07 | le lancement s'ouvre quand l'invité est présent et les accords 18+ donnés |
| I08 | l'invité reçoit exactement la carte que l'hôte a composée |
| I09 | cette carte vient bien de la sélection affichée à l'hôte |
| I10 | l'invité voit la révélation de la carte passée |
| I11 | la carte suivante arrive dans le même ordre chez les deux |
| I12 | un rechargement de l'invité le laisse dans la séquence |
| I13 | un salon complet refuse un troisième joueur avec un message lisible |

Le script écrit aussi `/tmp/qspicy-invite-calls.json` : tous les appels RPC avec leur code et
leur réponse, pour diagnostiquer un échec.

## Deuxième recette — DUOS et lien tronqué (`invite_duos.spec.mjs`)

| # | Vérification |
|---|--------------|
| D01 | le lien DUOS porte l'identifiant du salon |
| D02 | les quatre joueurs DUOS sont réunis par le même lien |
| D03 | un cinquième joueur DUOS est refusé avec un message lisible |
| D04 | le lien tronqué a bien perdu son paramètre de mode |
| D05 | un lien tronqué fait quand même arriver l'invité dans le salon Personnalisé |
| D06 | l'invité du lien tronqué ne voit aucun bouton de lancement catalogue |

## Constats de la dernière exécution (2026-11-24)

- **13/13 (Personnalisé) et 6/6 (DUOS et lien tronqué).** Le parcours d'invitation complet
  fonctionne sur une base construite uniquement à partir du dépôt, sans adaptateur de test.
- **`join_room_any` est désormais versionné** par `19_invitation_finalisation.sql`. Il n'existait
  auparavant que sur le serveur déployé : une base neuve n'acceptait aucune invitation sans
  l'adaptateur `bootstrap_custom_room.sql`, qui n'est plus utilisé.
- **`get_custom_deck` renvoie la séquence réelle** (`rooms.interaction_ids`) pour les salons
  Personnalisés du moteur catalogue. Il renvoyait `[]` auparavant.
- **Le type du salon est porté par la salle** (`rooms.room_kind`) : un lien tronqué (sans
  `&mode=custom`) fait maintenant arriver l'invité dans le bon format (D05).
- **La fonction Edge de photos est bouchonnée** (`server.mjs`) : elle n'existe pas sur une
  base locale. Un 200 non-JSON ferait blanchir tout l'écran d'attente, lien d'invitation
  compris.

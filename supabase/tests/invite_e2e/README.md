# Recette d'invitation — salon Personnalisé (base Supabase de test)

Vérifie le seul chemin d'entrée réel d'une partie : **le lien d'invitation**. L'hôte compose
une sélection Personnalisée, l'invité ouvre le lien dans un autre navigateur, et les deux
jouent la même séquence dans le même ordre.

Rien n'est simulé : le front compilé parle à une vraie base PostgreSQL par un vrai PostgREST,
avec les migrations du dépôt. Ni la production, ni `main` ne sont touchées.

## Lancer

```bash
bash supabase/tests/invite_e2e/run.sh
```

Prérequis : PostgreSQL 16 local, node/npm, `google-chrome`, `curl`, `python3`.

Le script, à chaque exécution :

1. télécharge PostgREST 16.6 dans `/tmp/qspicy-invite-e2e` (une fois) ;
2. recrée la base jetable `qspicy_invite_e2e` et applique les migrations dans l'ordre de
   `supabase/tests/run_postgres.sh` (01 → 18) ;
3. installe l'adaptateur de test `supabase/tests/bootstrap_custom_room.sql` ;
4. démarre PostgREST puis le front compilé, tous deux sur `127.0.0.1` ;
5. joue la recette dans trois navigateurs isolés et affiche `n/n vérifications réussies`.

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

## Constats de la dernière exécution (2026-11-24)

- **13/13.** Le parcours d'invitation complet fonctionne sur une base construite uniquement
  à partir du dépôt.
- **`join_room_any` n'est versionné dans aucune migration.** Il existe sur le serveur
  déployé (vérifié le 23/11) mais une base neuve — projet Supabase de test compris — n'accepte
  aucune invitation sans l'adaptateur `bootstrap_custom_room.sql`. C'est la première chose à
  versionner avant d'ouvrir un projet de test.
- **`get_custom_deck` renvoie `[]`** pour les salons Personnalisés créés par le moteur
  catalogue (migration 16) : `rooms.custom_deck` n'est plus rempli, la séquence vit dans
  `interaction_ids`. Le front s'en sort parce que les identifiants sont ceux du catalogue,
  mais l'appel est inutile et la séquence n'est pas lisible par l'API.
- **Le mode d'un salon vient du lien, pas du serveur.** Un invité qui ouvre
  `?room=<id>` sans `&mode=custom` (lien tronqué, favori enregistré) arrive dans le lobby
  Couple. Il ne peut pas lancer la partie — le serveur réserve le lancement à l'hôte — mais
  l'écran d'attente ne lui explique pas le format Personnalisé.
- **La fonction Edge de photos est bouchonnée** (`server.mjs`) : elle n'existe pas sur une
  base locale. Un 200 non-JSON ferait blanchir tout l'écran d'attente, lien d'invitation
  compris.

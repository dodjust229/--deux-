# Migrations Supabase — QSPICY

Les fichiers SQL de ce dossier sont la seule source de vérité du schéma. Ils s'appliquent **dans l'ordre**,
dans l'éditeur SQL du projet `xqvxorvvjmwzpcqmqnqv` ou via `psql`.

| Fichier | Contenu | Remarque |
|---|---|---|
| `01_schema.sql` | mode deux joueurs : tables, RLS, RPC, droits | à exécuter en premier |
| `02_catalog.sql` | catalogue initial V2 (220 cartes, intensité 1–5) | généré, UPSERT + retrait des anciennes cartes |
| `03_reconnexion_securisee.sql` | reprise de place par jeton uniquement | remplace `join_room` |
| `04_duo_consent_default_off.sql` | correctif historique DUOS | **obsolète** : voir ci-dessous |
| `05_duo_rpc_anon_only.sql` | correctif historique des droits | **obsolète** : repris par `06` |
| `06_duo_schema.sql` | schéma DUOS complet versionné : `rooms.mode`, `players.duo_no`, tables `duo_*`, RLS, 8 RPC, droits `anon` | rend le mode DUOS reproductible |
| `07_security_fixes.sql` | médias désactivés par défaut, réponses DUOS masquées avant révélation, cloisonnement des modes | sécurité et consentement |
| `08_duo_lifecycle.sql` | première version du redémarrage DUOS | remplacée par `09` |
| `09_duo_replay.sql` | revanche DUOS : vote des quatre joueurs, `players.replay_vote` | remplace `restart_duo_game` |
| `19_invitation_finalisation.sql` | `join_room_any` versionné, `get_custom_deck` corrigé, type de salon (`rooms.room_kind`), droits `anon` | finalise le parcours d'invitation |

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

Le catalogue historique comptait 48 cartes par palier. Le master V2 remplace cette répartition par 220 cartes et conserve les niveaux techniques 1–4, avec un champ éditorial distinct `intensity` de 1 à 5.


### Extension du catalogue — 48 cartes par palier

La migration historique `15_expand_session_catalog.sql` amène l'ancien catalogue à 192 cartes. Après les migrations 20 et 21, appliquer `22_catalogue_maitre_v2.sql` : elle ajoute `intensity`, remplace le catalogue par les 220 cartes du master V2 et retire les identifiants obsolètes. Elle ne supprime ni les salles ni les réponses. Les textes complets restent dans `src/catalog.json`.


## Palier 3 — moteur Personnalisé adossé au catalogue

Appliquer ensuite `16_custom_catalog_engine.sql`. Le mode Personnalisé sélectionne désormais
des identifiants canoniques de `public.catalog` au lieu de fabriquer des questions `perso-N`
à partir de textes libres. Il conserve ainsi le vrai format de chaque carte (libre, secret,
prédiction, défi, croisée), son niveau et ses options. Le serveur vérifie l'hôte, les deux
joueurs actifs, les catégories communes, les identifiants et le consentement 18+ avant le
lancement. La révocation du consentement saute toute carte de niveau 3–4 ou de catégorie
Audacieux. L'historique anti-répétition de la salle est également partagé avec les sessions
Personnalisées.

La migration conserve les salons déjà en cours qui utilisent encore les identifiants
historiques `perso-N` et leur `custom_deck`. L'ancien RPC de création à partir de texte libre
est révoqué pour les clients ; le nouveau RPC n'accepte que les IDs du catalogue.
La recette PostgreSQL exécute l'ancien parcours de compatibilité avant la migration 16,
puis les tests du nouveau moteur après celle-ci.


## Palier 4 — invitations, rôles et centres d'intérêt individuels

Appliquer ensuite `17_invitation_permissions.sql`. Le siège 1 est l'hôte ; les autres sièges
sont les invités. Seul l'hôte peut lancer une partie Couple, DUOS ou Personnalisée. Les
invités ne peuvent pas modifier le niveau ni les paramètres de lancement ; chacun choisit
son propre centre d'intérêt, exactement un. Le moteur combine les intérêts des participants
au lieu d'exiger une intersection identique, ce qui évite de bloquer une salle quand les
joueurs ont des goûts différents.

La migration :
- donne `decouverte` comme intérêt initial par défaut ;
- normalise les salons encore en attente en conservant le premier intérêt déjà choisi ;
- ne modifie aucune partie en cours ;
- impose exactement un intérêt par appel à `set_player_categories` ;
- protège les trois RPC de lancement par le rôle hôte côté serveur ;
- ferme l'ancien RPC `start_game` non gradué, qui n'est plus utilisé par l'application ;
- conserve les règles de consentement 18+ et l'historique anti-répétition.

Les notifications d'arrivée, de départ et de retour sont déjà présentes dans l'interface
(toasts issus de l'état de salle). Elles ne sont pas des notifications push en arrière-plan.

Le backend VIP 1 / Pass Hôte existe déjà dans Supabase : tables `host_payments` /
`host_subscriptions` et Edge Functions FedaPay `create-host-checkout`,
`verify-host-payment`, `fedapay-webhook`. Il n'est pas encore branché au client :
l'application ne gère pas encore l'Auth hôte, le paiement ni le contrôle d'abonnement
à la création des salles. Le modèle actif dans les Edge Functions est 750 XOF / 15 jours,
hôte payeur et invités gratuits. Ne jamais remplacer la vérification serveur par un
booléen côté navigateur. Voir `docs/QSPICY_PALIER_4_REPRISE_IA.md` pour la reprise.


## Finalisation du parcours d'invitation — `19_invitation_finalisation.sql`

Appliquer ensuite `19_invitation_finalisation.sql`. Elle rend le parcours d'invitation
reproductible sur une base neuve et corrige quatre écarts :

- **`join_room_any` est versionné.** C'est le seul point d'entrée utilisé par le client pour
  rejoindre une salle (`src/api.ts`), mais il n'était défini dans aucune migration : il
  n'existait que sur le serveur déployé, et les recettes locales le recréaient par un
  adaptateur jetable. Une base construite uniquement à partir du dépôt refusait donc toute
  invitation. La migration le définit à l'identique du dispatcher de production
  (DUOS → `join_duo_room`, sinon → `join_room`) et renvoie `room_kind` avec la réponse.
- **`get_custom_deck` renvoie la séquence réelle.** Pour les salons Personnalisés créés par le
  moteur catalogue (migration 16), `rooms.custom_deck` n'est plus rempli : la séquence vit dans
  `rooms.interaction_ids`. La fonction renvoie désormais cette séquence (les énoncés ne sont pas
  en base : `public.catalog` ne porte que `id/category/kind/options/level`, le texte vit dans
  `src/content.ts`).
- **Le type du salon est porté par la salle** (`rooms.room_kind` : `couple`, `custom`, `duos`).
  Un lien d'invitation tronqué (sans `&mode=custom`) ou un favori enregistré ne fait plus
  arriver l'invité dans le mauvais format. L'hôte le déclare via `set_room_kind` ; un invité ne
  peut pas le modifier.
- **Les privilèges RPC sont resserrés** : l'API de jeu est anonyme, `authenticated` n'a aucun
  droit d'exécution (intention de `05_duo_rpc_anon_only.sql`, jamais appliquée par les recettes).

La migration est additive et idempotente : aucune donnée n'est supprimée, aucune salle en cours
n'est modifiée. Les recettes `supabase/tests/run_postgres.sh` et
`supabase/tests/invite_e2e/run.sh` l'appliquent et ne dépendent plus d'aucun adaptateur de test.

## Migration 20 — intégrité des paliers et respect du mode

`20_level_and_mode_integrity.sql` corrige trois défauts constatés en jouant. Elle est
additive et idempotente, et **doit s'appliquer après `17_invitation_permissions.sql`** :
elle redéfinit `start_game_by_level` et `start_duo_game_by_level` en conservant toutes
les règles de la 17 (hôte seul, union des centres d'intérêt, consentement 18+).

- `rooms.current_level` : palier de session persistant, strictement non décroissant
  (trigger `trg_rooms_current_level`), exposé au client dans `get_room_snapshot`.
  L'interface lisait auparavant le palier de la carte tirée, d'où les régressions
  d'affichage (retour à 1 sans carte active, 3 → 2 → 1 en mode Personnalisé).
- `_effective_level(categories, level)` : relève le palier au minimum nécessaire quand
  le palier demandé ne produit aucune carte pour les catégories choisies. C'est le cas
  d'Audacieux, absent des paliers 1–2 : le choisir ne renvoie plus « aucune option
  disponible ». Un palier qui a déjà des cartes n'est jamais relevé.
- `restart_game` conserve l'accord 18+ d'une partie à l'autre (toujours révocable via
  `set_adult_consent`). L'effacer faisait sauter silencieusement les cartes `audacieux`
  dans `_advance`, ce qui rabaissait l'intensité de la partie.

Recette : `supabase/tests/level_and_mode_integrity.sql`, exécutée par `run_postgres.sh`
après la migration 20.


## Catalogue maître V2 — mise à jour à appliquer

Sur une base existante, exécuter `22_catalogue_maitre_v2.sql` **après** `21_explicit_content_floor.sql`. Cette migration est idempotente, ajoute `catalog.intensity` (1–5), synchronise les 220 cartes et supprime les anciennes cartes absentes du master. Elle doit être exécutée par le propriétaire du projet Supabase avant le déploiement du nouveau frontend. Ne pas appliquer cette migration à la production sans sauvegarde préalable.

## Migration 24 — options QCM canoniques côté serveur

Après les migrations précédentes, appliquer `24_qcm_options_from_server.sql`, **après la migration 22 du catalogue maître V2**. Les snapshots À Deux, Personnalisé et DUOS renvoient désormais `interaction_options` directement depuis `public.catalog`. Pour les questions de type `secret`, le navigateur utilise cette liste serveur au lieu de sa copie locale de `src/catalog.json`.

Cela évite qu'une différence de version entre le catalogue livré au navigateur et celui de Supabase affiche des choix que `submit_answer` rejetterait ensuite avec « Option invalide ». La validation serveur reste stricte : chaque réponse doit toujours correspondre exactement à une option canonique de la carte active.

Recette dédiée : `supabase/tests/qcm_options_from_server.sql`. Elle vérifie que le snapshot renvoie les quatre options de la carte QCM `p03` du catalogue V2 et que chacune est acceptée par `submit_answer`. Aucune donnée de production n'est modifiée par cette migration.

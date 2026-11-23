# Migrations Supabase — QSPICY

Les fichiers SQL de ce dossier sont la seule source de vérité du schéma. Ils s'appliquent **dans l'ordre**,
dans l'éditeur SQL du projet `xqvxorvvjmwzpcqmqnqv` ou via `psql`.

| Fichier | Contenu | Remarque |
|---|---|---|
| `01_schema.sql` | mode deux joueurs : tables, RLS, RPC, droits | à exécuter en premier |
| `02_catalog.sql` | catalogue des 43 interactions | TRUNCATE puis insert |
| `03_reconnexion_securisee.sql` | reprise de place par jeton uniquement | remplace `join_room` |
| `04_duo_consent_default_off.sql` | correctif historique DUOS | **obsolète** : voir ci-dessous |
| `05_duo_rpc_anon_only.sql` | correctif historique des droits | **obsolète** : repris par `06` |
| `06_duo_schema.sql` | schéma DUOS complet versionné : `rooms.mode`, `players.duo_no`, tables `duo_*`, RLS, 8 RPC, droits `anon` | rend le mode DUOS reproductible |
| `07_security_fixes.sql` | médias désactivés par défaut, réponses DUOS masquées avant révélation, cloisonnement des modes | sécurité et consentement |
| `08_duo_lifecycle.sql` | première version du redémarrage DUOS | remplacée par `09` |
| `09_duo_replay.sql` | revanche DUOS : vote des quatre joueurs, `players.replay_vote` | remplace `restart_duo_game` |\n| `10_host_billing.sql` | paiements hôtes et accès prépayés de 15 jours, RLS en lecture seule côté client | service_role uniquement pour les écritures |\n| `11_host_creation_gate.sql` | exige un compte hôte vérifié et un accès actif pour créer une salle | à appliquer après le déploiement du nouveau front-end |

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
\n\n## Comptes hôtes et paiements\n\nVoir [`PAYMENTS_SETUP.md`](../PAYMENTS_SETUP.md) pour la configuration Auth (OTP SMS/e-mail), les secrets FedaPay, les webhooks sandbox et l’ordre de déploiement. Ne pas appliquer `11_host_creation_gate.sql` avant que le nouveau front-end soit en ligne.\n
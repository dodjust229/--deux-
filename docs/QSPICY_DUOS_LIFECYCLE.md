# QSPICY — Cycle de vie DUOS : pause, révocation, revanche

Branche : `qspicy/duos-lifecycle` · Base : `main` (`f384834`) · Date : 2026-11-23

## Pourquoi

Le mode DUOS fonctionnait, mais une partie à quatre ne pouvait ni reprendre après une pause, ni
voir ses autorisations changer en cours de partie côté interface, ni se rejouer. Le schéma DUOS
n'existait par ailleurs que dans la base de production : rien n'était reconstructible ni testable.

## Ce qui change

### Base de données

| Migration | Effet |
|---|---|
| `06_duo_schema.sql` | versionne le schéma DUOS complet (colonnes `rooms.mode`, `players.duo_no`, tables `duo_permissions` / `duo_messages` / `duo_answers`, RLS, 8 RPC, droits `anon` uniquement) |
| `07_security_fixes.sql` | `receive_media` à `false` par défaut ; réponses DUOS masquées côté serveur avant la révélation ; `join_room`, `get_room_snapshot` et `restart_game` refusent un salon DUOS (`E_MODE`) |
| `08_duo_lifecycle.sql` | première version de `restart_duo_game` (redémarrage immédiat) |
| `09_duo_replay.sql` | `players.replay_vote` ; `restart_duo_game` devient un vote : la partie repart quand les quatre joueurs actifs ont validé ; le snapshot expose `replay {votes, needed, mine}` |

### Interface

- `src/screens/DuoScreens.tsx`
  - panneau « Partie en pause » avec bouton **Reprendre la partie** (`data-testid="duo-resume"`) ;
  - panneau repliable **Mes autorisations · effet immédiat** pendant la partie : espace commun,
    réception des médias, partage des réponses (`duo-live-cross`, `duo-live-media`, `duo-live-share`) ;
  - bascule automatique de l'onglet de discussion vers l'espace privé du duo quand l'autorisation
    de l'espace commun tombe ;
  - écran de fin : récapitulatif, bouton **Rejouer à quatre** avec compteur de votes
    (`data-testid="duo-replay"`), désactivé pour qui a déjà voté, et explication de l'effacement.
- `src/App.tsx` : branchement de `onResume`, `onPermissions`, `onReplay`.
- `src/api.ts` : `restartDuoGame`.
- `src/types.ts` : `Player.replay_vote`, `DuoReplay`, `DuoSnapshot.replay`.
- `src/lib/preview.ts` + `src/App.tsx` : aperçus de développement `?apercu=duo-lobby`, `duo-game`,
  `duo-paused`, `duo-end` (jamais compilés en production).
- `src/styles/screens.css` : style du panneau repliable.

### Documentation et tests

- `supabase/tests/recette_locale.sql` : recette complète à rejouer sur une base vierge.
- `supabase/README.md` : ordre des migrations, statut des fichiers 04/05/08, procédure de recette.
- `TESTS_A_DEUX.md` : points de vérification manuelle 20 à 24 (pause/reprise, révocation, médias,
  revanche, cloisonnement des modes).

## Effet immédiat de la révocation

Aucune temporisation : la révocation est écrite par `set_duo_permissions`, puis le snapshot suivant
applique la règle côté serveur.

- **Espace commun** : les messages `group` ne sont plus renvoyés au joueur qui a retiré son accord,
  et `send_duo_message` / `submit_duo_answer` refusent les nouveaux envois de groupe (`E_CONSENT`).
  Les réponses déjà partagées aux quatre cessent d'être visibles (`v_all_cross` faux).
- **Médias** : les stickers et GIF vers un destinataire qui a coupé la réception sont refusés (`E_MEDIA`),
  et les médias déjà reçus ne sont plus renvoyés.
- **Partage des réponses** : le retrait ferme la possibilité d'écrire en `duo` ou `group` ; les
  réponses déjà écrites avec cette visibilité restent soumises à l'accord de l'espace commun.

Rien n'est supprimé par une révocation : recocher restaure l'accès aux messages existants.

## Preuves exécutées (2026-11-23)

- Chaîne `01 → 02 → 03 → 06 → 07 → 08 → 09` rejouée sur PostgreSQL 16 vierge : aucune erreur.
- `supabase/tests/recette_locale.sql` : `RECETTE OK` (DUOS, révocation + revanche, deux joueurs).
- Migrations 06 à 09 idempotentes (rejouées deux fois).
- Droits : les 8 RPC DUOS + `restart_duo_game` sont exécutables par `anon`, pas par `authenticated` ;
  l'accès direct aux tables DUOS est refusé à `anon`.
- `npm test` : 21/21 tests + catalogue et pilote valides. `npm run build` : OK.
- Interface vérifiée dans Chrome sur les aperçus `duo-game`, `duo-paused`, `duo-end` (panneaux pause,
  autorisations, revanche) ; **pas de partie réelle à quatre**, qui aurait créé des données en production.

## Limites connues

- **Aucune salle n'a été créée en production** : les parcours sont prouvés en base locale et sur
  aperçus, pas par une partie réelle à quatre. La recette manuelle `TESTS_A_DEUX.md` 20–24 reste à faire.
- **Départ d'un joueur** : un joueur qui quitte un salon DUOS laisse une place vide et la partie ne
  peut plus avancer (quatre réponses exigées). Le remplacement en cours de partie n'est pas traité.
- **Revanche** : elle réutilise le même salon et le même lien ; les catégories choisies et les
  autorisations individuelles sont conservées, le consentement 18+ est à redonner.
- Aucune modification de la production Supabase, aucun déploiement Render.

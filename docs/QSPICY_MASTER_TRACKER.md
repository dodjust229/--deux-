# QSPICY — master tracker

Dernière mise à jour : 24 novembre 2026  
Dépôt : https://github.com/dodjust229/--deux-  
Application : https://a-deux-jeu.onrender.com  
Branche principale : `main`  
Branche en cours d'examen : `qspicy/test-invitation-personnalise` (invitations, paliers et modes, motion design et contenus explicites)

## Règle de reprise — éviter les audits en boucle

Avant tout nouveau travail :
1. Lire ce tracker et le dossier de reprise du palier concerné.
2. Vérifier les PR déjà fusionnées, les branches ouvertes et le commit actuellement déployé.
3. Reprendre uniquement les éléments explicitement marqués « restant ».
4. Ne pas refaire un audit général déjà documenté, sauf si un nouveau changement le rend nécessaire.
5. Ne jamais déclarer une livraison terminée sans CI, vérification du déploiement et recette adaptée.

L'utilisateur ne peut pas joindre de fichiers dans cette conversation. Travailler depuis GitHub, Supabase et Render ; ne pas redemander de fichiers.

## Avancement des paliers

| Palier | Sujet | État | Référence / restant |
|---|---|---|---|
| 1 | Cœur du jeu, niveaux, consentement 18+ | Livré | Main ; CI et Render validés. |
| 2 | Historique des questions et anti-répétition | Livré | `docs/QSPICY_PALIER_2_REPRISE_IA.md` ; migration 14 et catalogue étendu. |
| 3 | Mode Personnalisé | Livré | `docs/QSPICY_PALIER_3_REPRISE_IA.md` ; moteur de catalogue et garde-fous serveur déployés. |
| 4 | Invitations, rôles, intérêts individuels | Livré côté code | `docs/QSPICY_PALIER_4_REPRISE_IA.md` ; PR #20 fusionnée, migration 17 appliquée, Render live. Tests réels à 2/4 appareils encore à faire. |
| 5 | Confidentialité et photos personnelles depuis la galerie | Livré côté code et infrastructure | `docs/QSPICY_PALIER_5_REPRISE_IA.md` ; PR #21, #22, #23 fusionnées ; migration 18 et Edge Function déployées ; Render live. Recette photo multi-appareils restante. |
| 6 | Musique et ambiance | Livré code et déployé | PR #24 fusionnée ; CI #45372319685 réussie ; Render `dep-dc2m65ss728c73b0u7c0` live. Recette audio réelle mobile/desktop restante. |
| 7 | Tests globaux, bugs et stabilisation | Livré code et déployé | PR #25 fusionnée ; CI #45374406093 réussie, dont recette PostgreSQL 16 ; Render `dep-dc2mc1m7bikc7394161g` live. Recette terrain à deux/quatre appareils encore nécessaire. Voir `docs/QSPICY_PALIER_7_REPRISE_IA.md`. |
| 8 | Finalisation du parcours d'invitation | Livré sur branche, PR #27 à examiner | Branche `qspicy/test-invitation-personnalise` ; migration 19 ; recettes E2E 13/13 + 6/6 et suite SQL complète au vert sur base neuve ; CI du 24/11 sur la PR #27 : succès. Voir ci-dessous. |
| 9 | Motion design et contenus plus explicites | Livré sur branche, PR #27 à examiner | Branche `qspicy/test-invitation-personnalise` ; `src/styles/motion.css` et migration 21 ; 117 cartes réécrites ; suite SQL complète au vert, 41/41 tests front, `tsc -b` et build sans erreur. Voir ci-dessous. |

## Palier 9 — motion design et contenus plus explicites

Branche de travail : `qspicy/test-invitation-personnalise`. Aucune fusion dans `main`, aucun
déploiement de production, aucune écriture sur la base Supabase de production.

### Axe 1 — motion design

Diagnostic : le jeu n'avait qu'une seule animation de carte (`card-up`, un simple
`translateY`) et un rideau de niveau en fondu. Rien ne distinguait visuellement un palier 1
d'un palier 4 : la montée d'intensité se lisait, elle ne se voyait pas.

- **`src/styles/motion.css`** (nouvelle couche, importée en dernier) : tout est piloté par
  `data-level` (1 à 4) posé sur `.game`, `.prompt`, la barre de progression et le rideau.
  Un jeu de variables dérivées (`--heat`, `--heat-glow`, `--heat-ring`, `--heat-tint`,
  `--heat-pulse`) fait chauffer le cadre, le liseré et le halo à mesure que le palier monte.
- **Transitions de cartes** : entrée avec flou qui se résorbe, titre qui se pose après le
  cadre, étiquettes en cascade, texte qui se révèle. Le regard est conduit au lieu de subir
  une apparition sèche.
- **Montée d'intensité visible** : la barre de progression chauffe avec le palier et un
  reflet la traverse ; aux paliers 3–4 le cadre respire lentement (`heat-breathe`).
- **Feedbacks de jeu** : révélation des réponses en cascade (`--i` par carte, nom du joueur
  qui s'allume), validation d'envoi (`sent-pop` + vibration courte), rideau de niveau enrichi
  (halo, titre animé, pips de palier).
- **Micro-animations** : les émojis du compositeur sautent à l'insertion (`emoji-pop`),
  survol et appui animés.
- **Performance** : uniquement `transform`, `opacity` et `filter` — aucune propriété de
  layout animée, donc aucun reflow pendant la partie.
- **Accessibilité** : `:root[data-motion="reduced"]` neutralise toutes les animations ; le
  rideau reste lisible (opacité 1) au lieu de devenir invisible. Vérifié en navigateur :
  `animationName: none`, `curtainOpacity: 1`.

### Axe 2 — contenus plus explicites

Diagnostic : le banc de questions était inégal. Les paliers 3–4 contenaient des cartes
formulées de façon générique (« Qu'est-ce qui t'aide le plus à lâcher prise ? ») qui ne
disaient pas ce qu'elles voulaient dire, et la séduction de palier 2 restait allusive.

- **117 cartes réécrites** (`scripts/rewrite-cards.mjs`) : paliers 3 et 4 en entier, plus la
  séduction de palier 2. Les consignes sont désormais adressées directement, nomment le
désir, et gardent l'émoji et la forme interrogative exigés par `scripts/sync-catalog.mjs`.
- **Structure strictement conservée** : `id`, `category`, `kind`, `level`, `audience`,
  `visibility` sont inchangés (vérifié : 192 cartes, mêmes identifiants, même structure).
  Seuls `title`, `prompt` et `options` changent. Aucune recette existante n'est cassée.
- **`supabase/02_catalog.sql` régénéré** et cohérence vérifiée (`catalog:check`, `cards:check`).

### Axe 2 (suite) — le mode détermine réellement l'explicite

Deux causes réelles, distinctes du palier, corrigées par
**`supabase/21_explicit_content_floor.sql`** (additive, idempotente, appliquée après la 20) :

1. **`start_custom_game` écrivait `selected_level = 2` en dur** (migration 16), quel que soit
   le paquet lancé. Un salon Personnalisé composé de cartes de palier 4 se déclarait donc
   « palier 2 » : le serveur croyait servir du contenu doux et `_sync_adult` ne protégeait
   plus la partie comme il l'aurait dû. Le palier déclaré est maintenant celui du paquet
   réellement servi.
2. **Aucun plancher d'explicite n'existait.** On introduit `catalog.explicit_rank` (axe
   d'explicite, distinct du palier : une carte audacieuse est un cran au-dessus à palier
   égal) et `rooms.explicit_floor`, un plancher **strictement non décroissant** garanti par
   le trigger `trg_rooms_explicit_floor`. `_effective_level` reçoit ce plancher : le palier
   servi ne peut plus être rabaissé sous ce que la salle a déjà atteint.

Recette dédiée : `supabase/tests/explicit_content_floor.sql` (axe d'explicite cohérent,
plancher non décroissant, Personnalisé déclarant le palier du paquet, paquet doux ne
relevant pas le plancher).

### Résultats

| Suite | Résultat |
|---|---|
| Recette SQL complète (`run_postgres.sh`) | **verte** |
| dont Palier 7 sécurité | **OK** |
| dont permissions d'invitation | **OK** |
| dont intégrité paliers et modes | **OK** |
| dont **plancher d'explicite (nouvelle)** | **OK** |
| Tests unitaires front | **41/41** |
| `tsc -b` | sans erreur |
| `vite build` | sans erreur |
| Rendu visuel (Chromium) | dégradé d'intensité, cascade, feedbacks, mouvement réduit vérifiés |

### Reste à faire

- Revue de la PR, puis recette terrain à deux/quatre appareils (inchangée).
- Recette E2E navigateur (`invite.spec.mjs` / `invite_duos.spec.mjs`) non rejouée dans ce run.

## Palier 8 — finalisation du parcours d'invitation

Branche de travail : `qspicy/test-invitation-personnalise`. Aucune fusion dans `main`, aucun
déploiement de production, aucune écriture sur la base Supabase de production.

- **`join_room_any` versionné** (migration `19_invitation_finalisation.sql`). C'était le seul
  point d'entrée utilisé par le client pour rejoindre une salle, mais il n'était défini dans
  aucune migration : une base neuve construite à partir du dépôt refusait toute invitation, et
  les recettes locales le recréaient par un adaptateur jetable. Le dispatcher est désormais
  versionné (DUOS → `join_duo_room`, sinon → `join_room`) et renvoie `room_kind`.
- **`get_custom_deck` corrigé** : il renvoyait `[]` pour les salons Personnalisés du moteur
  catalogue (migration 16). Il renvoie maintenant la séquence réelle (`rooms.interaction_ids`).
- **Type de salon porté par la salle** (`rooms.room_kind`) : un lien tronqué (sans `&mode=custom`)
  ne fait plus arriver l'invité dans le mauvais format. `set_room_kind` réservé à l'hôte.
- **Privilèges RPC resserrés** : API anonyme, `authenticated` sans droit d'exécution.
- **Recettes** : `supabase/tests/invite_e2e/run.sh` (13/13 Personnalisé + 6/6 DUOS et lien
  tronqué) et `supabase/tests/run_postgres.sh` (21/21, 10/10, 9/9, Palier 7 OK, permissions
  d'invitation OK) tournent sur une base construite uniquement à partir des migrations, sans
  adaptateur de test. `run_postgres.sh` recrée désormais sa base à chaque exécution.
- **Reste à faire** : revue de la PR, puis recette terrain à deux/quatre appareils (inchangée).

## Palier 7 — stabilisation finale
- Correctif de course réseau : les réponses tardives d'une ancienne salle ne peuvent plus écraser la session courante ; isolation par salle/jeton/mode.
- Nouvelle recette PostgreSQL Palier 7 : accès directs, privilèges RPC, jetons, hôte, confidentialité des réponses DUOS et retrait du consentement croisé.
- PR #25 fusionnée ; CI #45374406093 : TypeScript, tests, build et PostgreSQL 16 réussis, y compris `PALIER 7 SECURITY REGRESSION OK`.
- Render `dep-dc2mc1m7bikc7394161g` live sur commit `e8617dda400578ea7b282bc0f0b7e2107a886e5d`.
- Reste la recette terrain sur deux/quatre appareils et les vérifications réelles photo/audio des paliers 5–6.
- Voir `docs/QSPICY_PALIER_7_REPRISE_IA.md`.

## Éléments encore ouverts

### Priorité 1 — recette terrain commune des paliers 4 à 7
- [Matrice et fiche de preuves](QSPICY_RECETTE_TERRAIN.md) : scénarios, résultats attendus et statut par appareil. Aucun test terrain n'est déclaré acquis.
- `main` (`3f14afe`) contient la livraison applicative `e8617dd`. [CI de main](https://github.com/dodjust229/--deux-/actions/runs/45374583686) confirmée et bundle Render public identique au build local.
- Point bloquant Palier 5 : vérifier l'accès photo déjà accordé après révocation, pas seulement la disparition de la galerie. Le nettoyage périodique reste à évaluer séparément.

### Après la stabilisation — évolutions non livrées
- Priorité 2 : messagerie du mode Personnalisé uniquement ; commentaires liés à la réponse et héritant de sa visibilité ; réutilisation du partage photo existant.
- Priorité 3 : identité sonore et console audio, sans lecture automatique.
- Priorités 4 et 5 : achever VIP1 séparément, puis étudier la voix.

### Palier 6 — recette audio après déploiement
- Code et infrastructure livrés ; PR #24 fusionnée et Render live.
- CI GitHub Actions run `45372319685` : TypeScript, tests unitaires/catalogue, build et intégration PostgreSQL 16 réussis.
- Reste la recette réelle : Lounge, Velours et Pluie sur mobile/ordinateur ; volume, arrêt, sortie, fin de partie et absence d'autoplay après rechargement.
- Voir `docs/QSPICY_PALIER_6_REPRISE_IA.md`.

### Priorité immédiate — recette Palier 5
- Tester l'envoi d'une vraie photo depuis la galerie sur deux appareils.
- Vérifier Couple, DUOS privé et espace commun à quatre.
- Vérifier retrait/réactivation du consentement, suppression et nettoyage.
- Voir `docs/QSPICY_PALIER_5_REPRISE_IA.md` pour les scénarios précis.

### Palier 4 — recette terrain
- Tester invitation et arrivée d'un invité sur un second appareil.
- Tester les quatre sièges DUOS et les intérêts individuels.
- Vérifier que seul l'hôte peut lancer la partie.

### VIP1 / Host Pass — chantier séparé non terminé
- Backend FedaPay et tables de paiement/abonnement déjà présents.
- Intégration Auth côté client absente à ce stade.
- UI de connexion téléphone + e-mail, vérification et paiement 750 FCFA / 15 jours à intégrer.
- Gating de création de salle à appliquer sans casser les RPC de jeu réservées à `anon`.
- Ne pas déclarer VIP1 terminé.

## État de livraison connu

- PR #21 — nettoyage des confidences locales : fusionnée.
- PR #22 — nettoyage centralisé lors de la fermeture de session : fusionnée.
- PR #23 — partage privé de photos depuis la galerie : fusionnée.
- Dernier commit applicatif Render live (Palier 7) : `e8617dda400578ea7b282bc0f0b7e2107a886e5d`.
- Déploiement Render Palier 7 : `dep-dc2mc1m7bikc7394161g`, statut live.
- Livraison précédente Palier 6 : commit `a0fba2bdcc77c60e4d72fd907a0d9c7f15811ed4`, déploiement `dep-dc2m65ss728c73b0u7c0`.
- Livraison précédente Palier 5 : commit `6bdfb67a522e1a0c8b625d3ddf9d3a8102cefb42`, déploiement `dep-dc2m1ee8bjmc738425s0`.
- Migration Supabase 18 : appliquée.
- Edge Function `qspicy-room-media` : ACTIVE, version 1.
- Bucket `qspicy-private-media` : privé, JPEG uniquement, 5 Mo maximum.
- Le dossier Palier 5 précise les limites de nettoyage après fermeture brutale de tous les navigateurs.

## Correctif paliers et modes (24/11/2026)

Trois défauts constatés en jouant, corrigés dans `supabase/20_level_and_mode_integrity.sql`
(additive, idempotente, appliquée après la 17 dont elle conserve toutes les règles).

- **La progression régressait.** L'interface lisait le palier de la carte tirée
  (`interaction.level`) au lieu du palier de session. Sans carte active l'affichage
  retombait à 1 ; en mode Personnalisé (paquet multi-paliers) il sautait de 3 à 2 puis à 1.
  `rooms.current_level` est désormais un palier de session persistant, strictement non
  décroissant (trigger `trg_rooms_current_level`), exposé au client via `get_room_snapshot`.
- **« Pas d'option disponible » en choisissant Audacieux.** Les cartes `audacieux`
  n'existent qu'aux paliers 3–4 (13 + 28, aucune aux paliers 1–2). `_effective_level`
  relève le palier au minimum nécessaire pour servir le mode choisi, sans jamais le
  rabaisser ni relever un palier qui a déjà des cartes.
- **L'intensité était rabaissée.** `restart_game` effaçait l'accord 18+ de tous les
  joueurs ; `_advance` sautait alors les cartes `audacieux`. L'accord est conservé d'une
  partie à l'autre (toujours révocable via `set_adult_consent`) et le palier ne recule plus.

Recette dédiée : `supabase/tests/level_and_mode_integrity.sql`. Suite SQL complète verte,
41/41 tests front, `tsc -b` sans erreur, CI GitHub verte (run 45397972009).

## Conventions techniques

- GitHub : `dodjust229/--deux-`, branche `main`.
- Supabase : projet `xqvxorvvjmwzpcqmqnqv`.
- Render : service `srv-dc1o8kt9fdbs73bd8qb0`.
- Les migrations numérotées sont conservées dans `supabase/` et les recettes PostgreSQL dans `supabase/tests/`.
- Les fonctions de jeu utilisent des jetons de joueur ; ne pas basculer globalement le client de jeu sur Auth sans analyse des grants existants.
- Les secrets de service ne doivent jamais être ajoutés au frontend ni aux fichiers du dépôt.

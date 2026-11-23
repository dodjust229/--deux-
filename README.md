# QSPICY — le jeu de conversation à deux

Application React + Vite + Supabase pour deux personnes : des questions, des confidences,
des défis facultatifs, mis en scène par deux personnages illustrés (Tao et Naya) qui écoutent,
réfléchissent et prennent la parole.

En ligne : https://dodjust229.github.io/--deux-/ (version finale vérifiée) et
https://a-deux-jeu.onrender.com (service Render, à redéployer). Identité officielle QSPICY
(logo et illustration du propriétaire), 43 cartes réécrites avec niveau et audience,
confidences privées.

Réservé aux adultes de 18 ans et plus. Gratuit, sans compte, sans installation pour les joueurs.

## Démarrer

```bash
npm ci
cp .env.example .env    # puis renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev
```

Tests, vérification et build :

```bash
npm test        # 21 tests unitaires + catalogue + pilote éditorial
npm run build   # TypeScript strict + build Vite
```

## Contenu du dépôt

Le code de l'application est à la racine (`src/`). L'archive `a-deux-source.tar.gz` est le
paquet utilisé par Render et par GitHub Actions ; elle est régénérée avec :

```bash
npm run pack:source
```

À exécuter après toute modification du code, sinon le déploiement servirait l'ancienne version.

## Documentation

- `docs/QSPICY_CAHIER_DES_CHARGES_GENSPARK.md` — cadrage produit ;
- `docs/GENSPARK_AUDIT_INITIAL.md` — état du code avant refonte ;
- `docs/GENSPARK_TEST_REPORT.md` — tests exécutés et résultats ;
- `docs/GENSPARK_HANDOFF.md` — lancement, mise en ligne, limites ;
- `docs/MODELE_CARTE.md` — modèle de carte, audiences DUOS, niveaux, visibilité et consentement ;
- `docs/RAPPORT_VALIDATION_PILOTE_V11.md` — contrôles et modifications du pilote v1.1 ;
- `content/pilot/` — catalogue pilote (30 cartes) en JSON et CSV de relecture ;
- `supabase/README.md` — ordre des migrations, recette locale obligatoire ;
- `docs/QSPICY_DUOS_LIFECYCLE.md` — cycle de vie DUOS : pause, révocation, revanche ;
- `docs/QSPICY_CATALOGUE_SENSUEL.md` — catalogue sensuel (49 cartes) et fonds animés, points à trancher ;
- `docs/QSPICY_ACCUEIL_SPEC.md` — composition de l'accueil plein cadre et format des images ;
- `INSTALLATION.md`, `TESTS_A_DEUX.md` — installation et vérification manuelle.

## Activer le salon Personnalisé (une seule étape, à faire par le propriétaire du projet)

Le mode Personnalisé enregistre les questions dans la salle, la base ne les connaît pas encore.

1. Ouvrir le projet Supabase → **SQL Editor** → coller le contenu de
   `supabase/10_custom_room.sql` → **Run**. Le script est idempotent (`if not exists`,
   `create or replace`) : le relancer est sans effet.
2. Vérifier l'installation :

   ```sql
   select proname from pg_proc where proname in ('start_custom_game','get_custom_deck');
   -- deux lignes attendues
   ```

3. Rien à redéployer côté Render pour le SQL ; l'écran Personnalisé fonctionne dès que la
   version du dépôt qui le contient est en ligne.

Tant que cette étape n'est pas faite, le bouton « Lancer la partie personnalisée » affiche
« Le salon Personnalisé n'est pas encore ouvert sur ce serveur » et n'enregistre rien : aucune
partie n'est simulée.

### Recette du salon Personnalisé sur une base de test

Aucune base de production n'est touchée. Sur une machine avec PostgreSQL 16 :

```bash
createdb qspicy_test
psql -d qspicy_test -c "create extension if not exists pgcrypto; create role anon nologin; create role authenticated nologin;"
for f in 01_schema 02_catalog 03_reconnexion_securisee 06_duo_schema 08_duo_lifecycle 09_duo_replay 07_security_fixes 10_custom_room; do
  psql -v ON_ERROR_STOP=1 -d qspicy_test -f supabase/$f.sql
done
python3 supabase/tests/custom_room.py
```

La recette vérifie 21 points : création, arrivée du deuxième joueur, refus de lancement pour
l'invité, refus de remplacement des questions, validations (5 à 24, longueur, doublons),
lancement, relecture après reconnexion, révélation simultanée, passage, fin de partie, et
absence de palier 18+.

## Stack

React 19, TypeScript 5.8, Vite 6, Supabase (RPC `SECURITY DEFINER`, aucune table exposée),
SVG et CSS pour les personnages et les animations. Aucune API payante, aucun service
d'images externe obligatoire.

## Déploiement

Render, service statique `a-deux-jeu` (`render.yaml`). Ne jamais déployer depuis une branche
de travail : la mise en ligne se fait après revue et fusion dans `main`.

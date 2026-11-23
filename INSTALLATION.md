# QSPICY — installation et vérification

## 1. Prérequis

- Node.js 22 LTS ou plus récent ;
- le projet Supabase `xqvxorvvjmwzpcqmqnqv` (schéma `supabase/01_schema.sql` et catalogue
  `supabase/02_catalog.sql` **déjà installés** — ne pas les réexécuter sans raison) ;
- la clé publique `publishable` du projet (elle est prévue pour le navigateur).

Ne jamais placer de clé `service_role` ni de secret dans l'application ou dans le dépôt.

## 2. Installation locale

```bash
npm ci
cp .env.example .env
```

Renseigner ensuite dans `.env` :

```text
VITE_SUPABASE_URL=https://xqvxorvvjmwzpcqmqnqv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

Puis :

```bash
npm run dev
```

Ouvrir l'adresse affichée (généralement `http://localhost:5173`). Pour jouer à deux sur un
même poste, utiliser deux navigateurs (ou une fenêtre privée) : chaque navigateur garde sa
propre session et ses propres préférences.

## 3. Fonctionnement du jeu

1. Une personne crée une salle et partage le lien d'invitation.
2. La seconde ouvre le lien, choisit son prénom de jeu et son personnage (Tao ou Naya).
3. Les deux choisissent les ambiances ; seules les catégories communes sont tirées.
4. Le mode 18+ est facultatif et exige l'accord explicite des deux joueurs, révocable.
5. Chaque partie tire jusqu'à 24 interactions parmi les 43 du catalogue.
6. Les réponses restent cachées jusqu'à la révélation ; la suite exige l'accord des deux.
7. Chacun peut passer une question ou quitter la salle à tout moment, sans justification.

## 4. Préférences

Thème clair/sombre, réduction des animations, sons et volume sont enregistrés sur l'appareil
du joueur (`localStorage`) et ne sont jamais partagés avec l'autre personne.

## 5. Vérification

```bash
npm test         # 21 tests unitaires + catalogue
npm run build    # compilation de production
npm run preview  # servir dist/ localement
```

Parcours manuel à deux navigateurs : voir `TESTS_A_DEUX.md`.

Écrans de démonstration sans backend (développement seulement) :
`http://localhost:5173/?apercu=home`, `?apercu=lobby`, `?apercu=game`, `?apercu=reveal`,
`?apercu=end`.

## 6. Modifier puis déployer

```bash
npm run pack:source    # régénère a-deux-source.tar.gz (obligatoire)
git add -A && git commit
```

Render reconstruit avec `tar -xzf a-deux-source.tar.gz && npm ci && npm run build`. Si
l'archive n'est pas régénérée, le site déployé garde l'ancien code.

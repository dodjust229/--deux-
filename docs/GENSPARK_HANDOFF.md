# QSPICY — dossier de reprise et de mise en ligne

> Branche `genspark/qspicy-refonte`. Aucun déploiement n'a été effectué. `main` n'a pas été touchée.

## 1. Lancer le projet en local

```bash
npm ci
npm run dev          # http://localhost:5173
```

Variables nécessaires (fichier `.env`, jamais commité) :

```text
VITE_SUPABASE_URL=https://xqvxorvvjmwzpcqmqnqv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…      # clé publique « publishable » uniquement
```

Ces deux valeurs sont déjà présentes dans `render.yaml`. **Ne jamais** mettre de clé
`service_role`, de secret ou de fichier `.env` dans le dépôt.

Autres commandes :

```bash
npm test             # 21 tests + cohérence du catalogue
npm run build        # TypeScript + build de production
npm run preview      # prévisualiser dist/
npm run pack:source  # régénère a-deux-source.tar.gz (obligatoire après toute modification)
```

## 2. Mode aperçu (développement uniquement)

`http://localhost:5173/?apercu=game` affiche les écrans avec des données de démonstration,
sans backend ni salle réelle :

| Paramètre | Écran |
|---|---|
| `?apercu=home` | accueil |
| `?apercu=lobby` | salle d'attente à deux |
| `?apercu=game` | question en cours |
| `?apercu=reveal` | réponses révélées (dont un sticker) |
| `?apercu=prediction` | question de prédiction |
| `?apercu=end` | fin de partie |

Ajouter `&reglages=1` ouvre la feuille de réglages. Ce code est retiré de la compilation de
production (`import.meta.env.DEV`).

## 3. Structure du projet

```
src/
  App.tsx                 session, polling, actions serveur, routage des écrans
  api.ts                  appels RPC Supabase (inchangés)
  types.ts, content.ts    contrat du snapshot, catalogue, libellés
  screens/                Home, Enter, Lobby, Game, End
  components/             Brand (logo piment), Character, Stage, Composer,
                          MediaContent (sticker/GIF), Settings, Icon
  lib/protocol.ts         erreurs serveur, prédiction, identifiant de salle (testé)
  lib/scene.ts            état de la partie → attitudes des personnages (testé)
  lib/media.ts            contenu typé texte/sticker/GIF (testé)
  lib/prefs.ts            préférences locales par appareil (testé)
  lib/sound.ts            sons générés en WebAudio, désactivés par défaut
  styles/                 base.css, stage.css, screens.css
scripts/pack-source.mjs   régénère l'archive utilisée par Render et la CI
supabase/                 schéma et catalogue existants — NON modifiés
docs/                     cadrage QSPICY, audit, ce dossier, rapport de tests
```

## 4. Médias : sticker et GIF sans migration

Le schéma n'a pas de table de messages ; les réponses vivent dans `answers.answer` (1 à 2000
caractères). Le contenu typé y est transporté avec un préfixe versionné :

| Type | Format | Rendu |
|---|---|---|
| Texte | texte brut (comme avant) | paragraphe |
| Sticker | `qs1:sticker:<id>` (`coeur`, `clin`, `rire`, `piment`, `chut`, `bravo`, `boude`, `etincelle`, `susurre`, `fou-rire`) | SVG intégré + libellé |
| GIF | `qs1:gif:https://…` (https, extension image ou hébergeur connu) | image animée, squelette puis fallback après 8 s |
| Version inconnue | `qsN:…` | « Ce média n'a pas pu être affiché » |

Les anciennes réponses restent lisibles à l'identique : tout ce qui ne commence pas par un
préfixe versionné est du texte. Les URL `javascript:`, `data:` et `http:` sont refusées.

Les stickers ne sont proposés que pour les questions ouvertes, les défis et les réactions
croisées. Un choix secret et une prédiction gardent leur format d'origine (validation serveur).

## 5. Préférences et accessibilité

- Thème clair/sombre, réduction des animations, sons, volume : stockés dans
  `localStorage` (`qspicy.prefs.v1`), **jamais envoyés au serveur**. La réduction des
  animations tient aussi compte de `prefers-reduced-motion`.
- Feuille de réglages : `role="dialog"`, focus initial sur « Fermer », fermeture par `Échap`.
- Contrastes vérifiés dans les deux thèmes ; zones tactiles ≥ 44 px ; libellés explicites.

## 6. Mise en ligne (à faire par le propriétaire, non exécutée)

Render construit le site depuis `a-deux-source.tar.gz` :

```yaml
buildCommand: tar -xzf a-deux-source.tar.gz -C . && npm ci && npm run build
staticPublishPath: ./dist
```

Procédure :

1. Fusionner `genspark/qspicy-refonte` dans `main` (revue humaine d'abord).
2. Vérifier que `npm run pack:source` a bien été exécuté après la dernière modification
   (`git status` doit être propre, l'archive est versionnée).
3. Dans Render : service `a-deux-jeu`, puis « Manual Deploy ».
4. Contrôler après déploiement : création de salle, jonction sur un téléphone, révélation,
   thème clair sur un seul appareil.

Aucune migration Supabase n'est nécessaire. Aucun secret supplémentaire n'est requis.

## 7. Vérifications avant de publier

```bash
npm ci
npm test        # 21/21 attendus
npm run build   # aucune erreur TypeScript
```

Puis, à deux navigateurs : création, jonction, lancement, réponses cachées, révélation,
double validation, pause, rechargement, coupure réseau, sticker et GIF.

## 8. Limites connues et suites possibles

1. Pas de messagerie libre ni de réactions persistées : le modèle de données ne les prévoit
   pas. Les stickers couvrent l'expression ; une évolution demanderait une table `messages`.
2. Le GIF dépend d'un hébergeur externe gratuit (Giphy, Tenor, Imgur) : fallback prévu.
3. Le polling reste à 2,2 s (mécanisme existant). Supabase Realtime réduirait la latence.
4. Les personnages sont des SVG stylisés ; des planches plus travaillées peuvent les
   remplacer sans toucher à la logique (états = classes CSS `data-state`).
5. Le bundle (~516 kB) contient surtout `@supabase/supabase-js` ; un `manualChunks` est
   possible mais n'apporte rien à cette échelle.
6. Les sons sont synthétisés (aucun fichier audio) et désactivés par défaut.

## 9. Fichiers principaux modifiés ou ajoutés

- `src/App.tsx` réécrit (session, polling, actions, routage) ;
- `src/screens/*` et `src/components/*` ajoutés ;
- `src/lib/scene.ts`, `media.ts`, `prefs.ts`, `sound.ts` ajoutés + tests ;
- `src/styles/*` remplacent `src/style.css` ;
- `index.html`, `package.json` (dépendances allégées), `package-lock.json` ;
- `scripts/pack-source.mjs` ajouté ; `a-deux-source.tar.gz` régénéré ;
- `README.md`, `INSTALLATION.md`, `TESTS_A_DEUX.md` mis à jour ;
- `docs/GENSPARK_AUDIT_INITIAL.md`, `docs/GENSPARK_TEST_REPORT.md`, ce dossier.
- Inchangés : `supabase/*`, `src/api.ts`, `src/types.ts`, `src/catalog.json`, `render.yaml`,
  `netlify.toml`.

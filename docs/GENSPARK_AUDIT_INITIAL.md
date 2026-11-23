# QSPICY — audit initial du code existant

> Réalisé le 23 novembre 2026 sur la branche `genspark/qspicy-refonte`, à partir de l'archive
> `a-deux-source.tar.gz` du dépôt `dodjust229/--deux-`. Ce document décrit ce qui existait
> **avant** la refonte, tel qu'observé dans le code et vérifié en exécution locale.

## 1. Ce que contenait réellement la branche

La branche ne contenait que :

- `README.md`, `render.yaml` (déploiement Render et variables publiques Supabase) ;
- `docs/` : les trois dossiers de cadrage QSPICY ;
- `a-deux-source.tar.gz` : l'application elle-même.

Le code de l'application n'existait donc que dans l'archive. Elle a été extraite et analysée ;
la version extraite compile (`npm ci`, `npm run build`) et ses tests passent (5/5).

## 2. Architecture observée

| Élément | Constat |
|---|---|
| Framework | React 19.1 + TypeScript 5.8, Vite 6.4 |
| Entrée | `src/main.tsx` → `src/App.tsx` (composant unique de 224 lignes) |
| État | `useState` + polling Supabase toutes les 2,2 s (recul jusqu'à 10 s) |
| Backend | Supabase, projet `xqvxorvvjmwzpcqmqnqv`, 11 fonctions RPC `SECURITY DEFINER` |
| Modèle | `rooms`, `players`, `answers`, `catalog`, `rate_events` ; RLS « deny direct » partout |
| Contenu | `src/catalog.json` (43 interactions), recopié en SQL par `scripts/sync-catalog.mjs` |
| Styles | un seul `src/style.css` (34 lignes + un ajout v2), polices Google |
| Animations | `framer-motion` + quelques animations CSS |
| Icônes | `lucide-react` |
| Poids | 622 kB de JavaScript (184 kB gzip) pour une application de 380 lignes |

Le jeu réel : deux joueurs, pas de compte, un jeton de session local, 24 interactions tirées
par salle, réponses cachées jusqu'à la révélation, progression à double accord.

## 3. Fonctionnalités réellement opérationnelles (à préserver)

Vérifiées par lecture et par exécution à deux navigateurs après refonte :

1. Création d'une salle et lien d'invitation (`create_room`).
2. Jonction par lien, reprise de place après 120 s d'absence, refus si la salle est pleine.
3. Choix de pseudo (2 à 20 caractères) et de personnage (`masculin`/`feminin` en base).
4. Choix de catégories + intersection stricte côté serveur (`start_game`).
5. Mode 18+ facultatif avec consentement explicite des deux joueurs, retrait immédiat.
6. Cinq formats d'interaction : `free`, `secret`, `prediction`, `challenge`, `cross`.
7. Réponses masquées jusqu'à la révélation, y compris pour les questions croisées.
8. Progression à double validation, idempotente (`next_interaction`).
9. Pause/reprise partagée, sortie volontaire, redémarrage en fin de partie.
10. Gestion des erreurs fatales (salle inconnue, expirée, session remplacée) et transitoires.

## 4. Défauts constatés

| # | Défaut | Preuve / conséquence |
|---|---|---|
| 1 | Identité « À Deux » avec cœur, logo A2 | Contraire au cadrage QSPICY |
| 2 | Avatars dessinés en CSS, 4 humeurs seulement (`idle`, `think`, `laugh`, `talk`) | Pas de scène dialoguée crédible ; un seul personnage peut parler |
| 3 | Bulles positionnées en absolu au-dessus des avatars | Chevauchement texte/personnage constaté par le propriétaire |
| 4 | Animations décoratives permanentes (`float`, `breathe`) sans lien avec l'état du jeu | Désynchronisation, gêne visuelle |
| 5 | « Réduire les animations » = `animation:none` sur `*` | Fige aussi les transitions utiles ; les personnages restent en posture par défaut |
| 6 | Aucune préférence de thème, de son ou de volume | Le thème clair n'existait pas |
| 7 | Aucune notion de sticker, GIF, réaction ni message dans le code livré | Le problème signalé par le propriétaire vient d'une version dont le code n'est pas dans l'archive |
| 8 | Un seul fichier `App.tsx` de 224 lignes mêlant logique, vues et styles | Maintenance difficile |
| 9 | `framer-motion` et `lucide-react` embarqués pour un usage marginal | 622 kB de JavaScript, avertissement de taille Vite |
| 10 | Écran d'attente sans indication de progression ni de rôle des joueurs | Expérience floue |
| 11 | Bouton « Paramètres » sans thème/son alors que le journal des décisions mentionne un bouton son retiré | Incohérence de documentation |
| 12 | `?room=` ouvrait l'écran de connexion sans préremplissage complet | Un lien partagé demandait de recopier l'identifiant |

## 5. Risques et contraintes à respecter

- **Ne pas toucher au schéma Supabase** : aucun changement n'était nécessaire, la refonte
  s'appuie sur les 11 RPC existantes. Aucune migration n'a été écrite ni appliquée.
- **Ne pas déployer** : `render.yaml` et `netlify.toml` restent en l'état, aucun déploiement
  n'a été déclenché.
- **Protéger `main`** : tout le travail est sur `genspark/qspicy-refonte`.
- **Aucune clé secrète** : seule la clé `publishable` (publique par conception) est utilisée.
- **Compatibilité ascendante** : les réponses déjà stockées (texte libre, JSON de prédiction,
  options de choix secret) restent lisibles et affichées correctement.

## 6. Décisions de refonte

- Découpage en `screens/`, `components/`, `lib/` ; `App.tsx` ne garde que la session, le
  polling et les actions serveur.
- Deux personnages SVG originaux (Tao et Naya), 9 états d'expression pilotés par l'état réel
  de la partie (`src/lib/scene.ts`, testé).
- Zone de bulle réservée dans la grille : plus aucun chevauchement possible avec le texte,
  les boutons ou les personnages.
- Préférences strictement locales (`src/lib/prefs.ts`) : thème, réduction des animations,
  sons, volume. Le thème d'un joueur ne part jamais vers l'autre.
- Contenu typé pour les médias (`src/lib/media.ts`) transporté dans le champ `answer`
  existant, sans changement de schéma : `qs1:sticker:<id>` et `qs1:gif:<url>`.
- Suppression de `framer-motion` et `lucide-react` ; icônes intégrées ; animations CSS/SVG.
  JavaScript ramené à environ 516 kB (149 kB gzip), dont l'essentiel est `@supabase/supabase-js`.

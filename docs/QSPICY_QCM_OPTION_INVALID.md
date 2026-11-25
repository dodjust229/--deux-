# QSPICY — régression « Option invalide » sur les choix QCM

## Symptôme reproduit par l'utilisateur

Sur l'écran d'une question secrète au palier 3, quatre propositions sont visibles et
sélectionnables. Après avoir choisi une proposition et appuyé sur « Envoyer », le serveur
renvoie « Option invalide ».

## Cause technique retenue

- Le navigateur construisait l'interaction à partir de sa copie locale du catalogue
  (`src/content.ts` / `src/catalog.json`).
- Le RPC `submit_answer` validait le texte choisi contre `public.catalog.options`
  dans Supabase, avec l'opérateur JSONB `?`.
- Le snapshot renvoyait l'identifiant de la carte, mais pas les options canoniques de la base.
- Si les options locales et celles de la base divergeaient, l'interface pouvait proposer un
  choix que le serveur rejetait correctement.

## Correction

Migration `supabase/24_qcm_options_from_server.sql` (après le catalogue maître V2) :
- ajoute `interaction_options` aux résultats de `get_room_snapshot` et `get_duo_snapshot`, directement depuis
  `public.catalog` ;
- ne désactive ni ne relâche la validation serveur.

Côté client :
- `getSnapshot` et `getDuoSnapshot` remplacent les options locales d'une carte `secret` par les options reçues
  du serveur ;
- si le serveur renvoie explicitement `null`, aucun faux choix local n'est présenté ;
- les autres types de cartes ne changent pas.

## Recettes

- Tests unitaires : options serveur prioritaires, réponse vide en cas d'options serveur
  absentes, autres types de cartes inchangés.
- PostgreSQL 16 : snapshot À Deux identique à `public.catalog.options`, validation des quatre
  propositions de la carte `p03` (palier 3) par `submit_answer`, et vérification du snapshot DUOS.
- Build, TypeScript, catalogue et suite SQL complète exécutés par GitHub Actions.

## Limites

- Aucune écriture sur Supabase production.
- Aucun déploiement Render ou GitHub Pages.
- La migration doit être appliquée au projet Supabase avant le déploiement du frontend
  qui s'appuie sur `interaction_options`.

# À Deux — jeu relationnel interactif

Application React + Vite + Supabase pour deux joueurs.

## Source du projet

Le dépôt attend l'archive source **a-deux-source.tar.gz** à sa racine. Elle doit contenir les sources du dossier (package.json, src/, supabase/, etc.) et ne doit contenir ni .env, ni node_modules, ni dist.

Après ajout de l'archive, GitHub Actions exécute automatiquement les tests et la compilation. Render utilise render.yaml pour construire le site statique et publier dist/.

## Déploiement Render

1. Ajouter a-deux-source.tar.gz à la racine du dépôt.
2. Ouvrir https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fdodjust229%2F--deux-
3. Vérifier le service a-deux-jeu et cliquer sur Apply.
4. Saisir la clé publique Supabase dans VITE_SUPABASE_ANON_KEY si Render la demande.

La variable VITE_SUPABASE_URL est déjà renseignée. La clé publishable est destinée au navigateur. Ne jamais publier une clé service_role ni un fichier .env.

## Stack

React 19, TypeScript, Vite 6, Supabase. Voir INSTALLATION.md et AUDIT_ETAT.md dans l'archive source.

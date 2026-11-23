# Journal des décisions — reprise « À deux » (22/11/2026)

Base : 3e snapshot (34 interactions, schéma v1). Sauvegarde intacte : `backup/`. Fichiers du journal absents du paquet (src/art, src/styles, SQL v2 original, scripts) : NON restaurables, réimplémentés.

## Constats sur la base fournie (vérifiés)
- `npm run build` échouait (`import.meta.env` sans `vite-env.d.ts`).
- SQL v1 : `d09` (complicité) et `c01` absents de la liste SQL → 33 interactions servies sur 34.
- Révélation automatique dès 2 réponses, aucun consentement côté serveur (booléen `p_adult` du navigateur), départ = joueur « offline » définitif, salle bloquée, aucune limite de création, aucun nettoyage, `_player_for` exécutable par `anon`, « Suivant » faisait avancer sans accord de l'autre.
- Risque probable non vérifié sur Supabase réel : `digest()`/`gen_random_bytes()` vivent dans le schéma `extensions` ; v2 les résout via `search_path = public, extensions, pg_temp`.

## Changements
- Catalogue : source unique `src/catalog.json` (parseur JSON, pas de regex), `c01` reclassé, 43 interactions, formats free/secret/prediction/challenge/cross, options validées côté serveur.
- SQL v2 : consentement 18+ serveur (2 accords, retrait immédiat + saut), présence par `last_seen`, grâce 120 s, reprise de place, départ volontaire, pause, progression à double accord idempotente, croisée ordonnée, limite 8 salles/h/client, purge (6 h d'inactivité), droits fermés par défaut.
- Client : erreurs fatales/transitoires (plus de boucle), recul de polling, bulles près du locuteur, expressions, pause/paramètres, animations réduites, bouton son retiré (aucun son n'existe).

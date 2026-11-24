# QSPICY — dossier de reprise IA · Palier 3

Date : 24 novembre 2026  
État : audit technique effectué ; aucune modification applicative ni migration de production n'a été appliquée.  
Périmètre prioritaire identifié : rendre le mode **Personnalisé** cohérent avec le catalogue complet et sûr pour les paliers 3–4.

## Constat vérifié sur `main`

Le mode Personnalisé n'est pas vide : il existe déjà et génère des questions automatiquement.

Fichiers examinés :
- `src/components/CustomQuestions.tsx`
- `src/lib/custom.ts`
- `src/lib/custom.test.ts`
- `src/App.tsx`
- `src/api.ts`
- `src/screens/Lobby.tsx`
- `src/types.ts`
- `supabase/10_custom_room.sql`
- `supabase/01_schema.sql`
- `supabase/11_game_levels.sql`
- `supabase/12_level_consent_guard.sql`
- `supabase/14_session_question_history.sql`

### Fonctionnement actuel
1. L'hôte choisit le nombre de questions et les catégories communes.
2. Le navigateur tire les questions depuis le catalogue avec `buildCustomDeck`.
3. Le paquet est envoyé à `start_custom_game` sous forme de tableau de textes.
4. La base stocke les textes dans `rooms.custom_deck` (JSONB) et les identifiants de séquence `perso-1…perso-n`.
5. Les deux joueurs relisent le même paquet via `get_custom_deck`.

### Limites visibles et confirmées
- `buildCustomDeck` ne prend que les cartes `kind === "free"` et `level <= 2`.
- Les types `secret`, `prediction`, `challenge` et `cross` sont exclus.
- Le composant annonce explicitement que les paliers 3–4 ne sont pas encore disponibles.
- La carte reconstruite par `customInteraction` est toujours une question libre de niveau 2 ; elle ne conserve ni les options, ni le type, ni le niveau, ni la visibilité d'origine.
- Le lobby Personnalisé ne présente pas le panneau de consentement 18+ qui existe dans le lobby Couple.
- `start_custom_game` force `adult_enabled=false` et ne définit pas `selected_level` : la valeur par défaut de la salle peut rester 2.
- Le moteur de révocation du consentement (`_sync_adult` dans les migrations de base/niveaux) inspecte les identifiants courants dans `public.catalog`. Les identifiants `perso-n` n'y existent pas. Il ne peut donc pas classifier une carte personnalisée comme niveau 3/4 ou 18+.

## Blocage de sécurité — ne pas lever la limite côté interface seulement

Autoriser les cartes des paliers 3–4 dans `buildCustomDeck` sans refonte du contrat serveur créerait un faux sentiment de protection :
- le serveur ne connaît pas le niveau réel des questions personnalisées ;
- le consentement révoqué ne peut pas identifier la carte personnalisée courante ;
- la carte affichée perdrait ses options et son comportement ;
- le mode de réponse/avancement n'est pas garanti pour tous les types.

**Ne pas simplement retirer le filtre `level <= 2` ou `adult_enabled=false`. Ne pas mettre à jour la production avant que les tests de révocation et d'avancement soient verts.**

## Plan d'implémentation recommandé pour le palier 3

### Étape A — contrat de carte versionné
Remplacer le tableau de textes par un tableau de cartes structurées validées côté serveur. Chaque entrée doit au minimum conserver :
- `id` source du catalogue ;
- `category`, `kind`, `title`, `prompt`, `options` ;
- `level`, `audience`, `visibility`.

La base ne doit jamais faire confiance au niveau ou au type transmis par le navigateur. Le serveur doit vérifier les identifiants contre `public.catalog` et reconstruire les cartes canoniques depuis cette table. Le navigateur ne transmet que des identifiants et un nombre de cartes souhaité, ou un paquet d'IDs soumis à validation serveur.

### Étape B — consentement 18+
- Reprendre le contrôle des deux consentements du lobby Couple.
- Pour un paquet contenant une carte de niveau 3 ou 4, exiger deux consentements explicites avant le lancement.
- Conserver la règle de révocation immédiate pendant la partie.
- Adapter `_sync_adult` et les fonctions de progression pour examiner les métadonnées de la carte personnalisée courante, pas seulement `public.catalog`.
- Ne jamais déduire l'âge réel d'une déclaration ; garder l'avertissement de déclaration d'âge et la révocabilité.

### Étape C — moteur de jeu
- Reconstruire la carte courante avec son vrai `kind`, `options`, `level`, `visibility`.
- Vérifier le comportement de `secret`, `prediction`, `challenge` et `cross` dans l'écran de jeu et les RPC de réponse.
- Garder la séquence en base comme source de vérité pour les deux joueurs et la reconnexion.
- Appliquer l'historique anti-répétition du palier 2 aux nouvelles sessions Personnalisées, sans réinitialiser l'historique des autres pools.
- Garder le mode Personnalisé Couple uniquement tant que le mode DUOS n'a pas son propre parcours testé.

### Étape D — tests obligatoires
- tests unitaires de sélection : niveaux, catégories, types, options, absence de doublons ;
- tests SQL : hôte seul autorisé à lancer, invités non autorisés à remplacer le paquet, validation des IDs, nombre de cartes ;
- tests de consentement : lancement niveau 1–2 sans accord 18+, lancement niveau 3–4 refusé sans les deux accords, retrait de l'un des accords pendant une carte 18+ ;
- tests de comportement de chaque type de carte ;
- reconnexion des deux joueurs au même paquet et au même index ;
- historique anti-répétition sur deux parties Personnalisées ;
- build TypeScript, tests du catalogue, tests PostgreSQL et CI GitHub.

## Migrations / production

Aucune migration n'a été appliquée pendant cet audit.  
Aucune donnée de production n'a été modifiée.  
Le palier 2 reste intact : migrations 14 et 15, historique des salles et catalogue de 192 cartes.

Avant toute migration, lire la documentation Supabase à jour, créer une migration versionnée, tester sur PostgreSQL jetable, puis appliquer en production uniquement après validation des tests et des droits RPC.

## Vérifications à ne pas oublier
- Les fonctions `start_custom_game` et `get_custom_deck` de la migration 10 sont des fonctions `SECURITY DEFINER` exposées au rôle `anon` : conserver l'authentification par jeton via `_player_for`, les contrôles d'hôte et les droits minimaux.
- Ne pas exposer de clé `service_role` côté client.
- Vérifier explicitement les droits `EXECUTE` après toute modification de RPC.
- Le test de révocation doit couvrir une carte personnalisée 18+ actuellement affichée, pas uniquement les cartes du catalogue standard.

## État de reprise
Le prochain agent peut reprendre directement à l'étape A. Le palier 3 n'est pas déclaré livré : il est audité et spécifié, mais non codé, non migré et non déployé.

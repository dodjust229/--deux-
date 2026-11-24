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

## État de reprise — mise à jour du 24 novembre 2026

L'audit initial et son plan ci-dessus sont historiques. L'implémentation a depuis été réalisée et fusionnée.

### Livré dans GitHub
- PR #19 fusionnée dans `main` : commit `2c73cac7ccedb431ecb6e6a23aa37a6af4424aaa`.
- Mode Personnalisé basé sur les IDs canoniques de `public.catalog`, avec les cinq types de cartes, niveaux, options et comportements d'origine.
- Contrôles serveur : hôte, deux joueurs actifs, catégories communes, IDs uniques et valides.
- Consentement 18+ des deux joueurs lorsque la sélection contient une carte de niveau 3–4 ou Audacieux.
- Révocation : suppression des réponses de la carte adulte courante et saut des cartes adultes suivantes.
- Historique anti-répétition réutilisé par les sessions Personnalisées.
- Anciennes salles déjà en cours avec IDs `perso-N` conservées via `get_custom_deck`.
- Ancien RPC de texte libre supprimé pour éviter une surcharge PostgREST ambiguë.

### Vérifications
- GitHub Actions run `45361919599` : succès complet — TypeScript, tests unitaires/catalogue, build de production et recette PostgreSQL 16.
- Migration `supabase/16_custom_catalog_engine.sql` appliquée au projet Supabase de production.
- Vérification production : ancien RPC absent ; nouveau RPC présent ; exécution autorisée à `anon` uniquement (authentification par jeton dans la fonction) ; `authenticated` non autorisé ; catalogue toujours à 192 cartes ; historique de session présent.

### Déploiement et reste à faire
- Déploiement Render `dep-dc2l7r68bjmc73823420`, commit `2c73cac7...` : statut observé au dernier contrôle `build_in_progress`. Ne pas annoncer le mode Personnalisé comme disponible en production tant que ce déploiement n'est pas confirmé `live`.
- Les tests automatisés PostgreSQL couvrent la sélection, le contrôle d'hôte, les IDs canoniques, le consentement, la révocation et l'anti-répétition.
- Il reste une recette manuelle sur deux appareils réels pour vérifier le parcours visuel, les cinq types de cartes, la reconnexion et la synchronisation des consentements. Aucun test réel sur deux appareils n'a été effectué par l'agent.

Le prochain agent doit reprendre à la vérification finale Render puis à la recette manuelle ; ne pas refaire l'audit ni réécrire la migration 16 sans raison technique démontrée.

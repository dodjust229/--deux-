# À Deux — état des vérifications

## Vérifications réussies
- 5 tests automatisés : réussis (erreurs, prédiction, extraction de lien, alternance des joueurs et intersection stricte des catégories).
- Catalogue : 43 interactions, 43 identifiants uniques ; synchronisation SQL vérifiée.
- Backend Supabase : test à deux joueurs déjà réalisé (création, jonction, réponses masquées, révélation et progression synchronisée).
- Préférences de catégories : test direct sur le projet Supabase ; les catégories non communes sont refusées, seules les catégories communes sont tirées et le mode 18+ reste désactivé sans sélection commune et consentement des deux.
- Correction du consentement 18+ au redémarrage : testée sur le projet Supabase connecté.
- Fenêtre d'absence pour les questions croisées (30 s d'affichage « hors ligne », 120 s avant libération) : testée sur le projet Supabase connecté.
- Les 5 tables principales ont RLS activé ; l'accès direct aux tables est fermé. Les joueurs passent par les fonctions RPC prévues.
- Index de performance sur `answers.player_id` présent ; aucun avertissement de performance Supabase.
- Configuration Netlify et vérification GitHub Actions ajoutées. Le fichier `.env` est exclu de Git.

## Vérifications encore nécessaires
- La compilation de production (`npm run build`) n'a pas pu être validée localement : le registre npm n'est pas résolu par DNS dans l'environnement de travail, donc les dépendances ne peuvent pas être installées. Le workflow GitHub Actions est prévu pour exécuter `npm ci`, les tests et le build sur un runner connecté.
- Le parcours visuel complet sur deux navigateurs/appareils réels reste à faire après le déploiement.
- Le déploiement Netlify n'est pas encore effectué.

## Sécurité à connaître
- Les clés `service_role` et secrètes ne sont jamais intégrées au frontend ni au dépôt.
- La clé `publishable` utilisée par le navigateur est conçue pour être publique. Les opérations passent par des RPC qui valident un jeton de joueur ; les tables ne sont pas accessibles directement aux rôles clients.
- Supabase signale encore les fonctions `SECURITY DEFINER` exécutables par `anon`. C'est le modèle d'accès choisi pour permettre aux joueurs sans compte d'utiliser les RPC. Les fonctions vérifient le jeton de salle ; cet avertissement n'est donc pas présenté comme une absence totale d'alertes de sécurité.
- Le mode 18+ repose sur la déclaration des joueurs, pas sur une vérification d'identité ou d'âge.

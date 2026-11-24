# QSPICY — dossier de reprise IA · Palier 7

Date : 24 novembre 2026
Branche : `qspicy/palier-7-stabilisation`
Objet : tests de régression globaux et stabilisation finale.

## Correctif applicatif

### Course réseau entre deux salles
L'ancien polling utilisait un seul booléen `inFlight`. Si une requête de l'ancienne salle terminait après une sortie ou un changement de salle, elle pouvait encore écrire son snapshot dans l'interface de la nouvelle session. Elle pouvait aussi déclencher une fausse notification d'arrivée/départ. Le booléen empêchait en plus la nouvelle salle de lancer immédiatement son propre refresh.

Correction dans `src/App.tsx` :
- chaque session est identifiée par salle + jeton + mode via `sessionFingerprint` ;
- les requêtes en vol sont suivies par session, et non par un booléen global ;
- les réponses et erreurs d'une session devenue inactive sont ignorées ;
- l'historique local de présence et la dernière question sont réinitialisés au changement de salle ;
- la sortie invalide immédiatement la session active avant même le prochain rendu React.

Tests unitaires associés dans `src/lib/protocol.test.ts`.

## Recette de sécurité ajoutée à la CI

Nouveau fichier : `supabase/tests/palier7_security_regression.sql`.

Il contrôle :
- l'absence d'accès direct `anon`/`authenticated` aux tables privées et aux RPC internes de médias ;
- les droits d'exécution des RPC hôte et des fonctions de consentement tokenisées ;
- RLS activée sur `room_media`, sans policy client directe ;
- le bucket photo privé ;
- refus d'un jeton d'une autre salle et d'un faux jeton ;
- refus de lancement Couple par l'invité ;
- confidentialité des réponses DUOS avant révélation ;
- visibilité après révélation selon les audiences `private`, `duo`, `group` et `pass` ;
- masquage immédiat des réponses de groupe après retrait du consentement croisé ;
- refus d'une nouvelle réponse de groupe sans les quatre accords.

Le script est intégré à `supabase/tests/run_postgres.sh` après les migrations 17 et 18. Il tourne sur la base PostgreSQL jetable de GitHub Actions ; il ne modifie pas la production.

## État de l'audit Supabase — production

Les RPC `SECURITY DEFINER` exposés à `anon` sont intentionnels pour l'application sans compte : chaque opération sensible appelle `_player_for(room_id, player_token)`, qui vérifie le jeton haché, la salle, l'expiration, le statut du joueur et la révocation/remplacement. Les fonctions internes et RPC de médias restent non exécutables par `anon`.

Les alertes de l'Advisor ne sont pas toutes des vulnérabilités :
- 25 avertissements `SECURITY DEFINER` correspondent aux RPC publiques tokenisées du jeu ; ne pas les révoquer en bloc, cela casserait les joueurs anonymes.
- `room_media` a RLS activée sans policy client : c'est volontaire, l'accès passe exclusivement par l'Edge Function et les RPC réservées au rôle serveur.
- Deux avertissements `auth_rls_initplan` sur les tables Host Pass et un index FK manquant sur `room_media.sender_player_id` restent des optimisations de base de données ; aucune migration de schéma n'est nécessaire pour le correctif de course réseau et la recette de régression.

## Vérifications automatiques attendues

GitHub Actions doit réussir :
1. `npm run typecheck` ;
2. `npm test` et contrôles du catalogue ;
3. `npm run build` ;
4. migrations et intégration PostgreSQL 16, dont la nouvelle recette Palier 7.

## Recette terrain qui reste nécessaire

Un test automatisé sur PostgreSQL ne remplace pas l'utilisation de vrais appareils. Depuis deux téléphones ou un téléphone + ordinateur :
- Couple : créer, rejoindre, changer d'intérêt, lancer, répondre, révéler, passer, mettre en pause, reprendre, quitter et rejoindre à nouveau ;
- DUOS : quatre sièges, intérêts individuels, permissions croisées, réponses privées/duo/groupe, retrait d'accord et revanche ;
- photos : galerie, aperçu, envoi, réception, révocation, suppression et fin de partie ;
- audio : Lounge, Velours, Pluie, volume, arrêt et absence d'autoplay ;
- réseau : basculer Wi-Fi/4G, actualiser une page, quitter une salle puis en rejoindre une autre ;
- vérifier que l'ancienne salle ne réapparaît pas et qu'aucune notification fantôme n'est affichée.

## Hors périmètre

VIP1 / Pass Hôte reste un chantier commercial séparé : le backend FedaPay existe, mais l'authentification hôte, le paiement et le contrôle d'abonnement dans l'application ne sont pas livrés. Ne pas le présenter comme terminé.

## Statut

Palier 7 : correctif et recette de régression ajoutés au dépôt ; clôture technique après CI, fusion et Render live. La recette manuelle multi-appareils reste à confirmer avant de qualifier l'ensemble du produit de testé sur le terrain.

## Production — livraison Palier 7

- PR #25 fusionnée : https://github.com/dodjust229/--deux-/pull/25.
- Commit de fusion : `e8617dda400578ea7b282bc0f0b7e2107a886e5d`.
- GitHub Actions run `45374406093` : `success` — TypeScript, tests unitaires/catalogue, build Vite et intégration PostgreSQL 16.
- La recette PostgreSQL finale a terminé par `PALIER 7 SECURITY REGRESSION OK`.
- Render : déploiement `dep-dc2mc1m7bikc7394161g`, statut `live`.
- Application : https://a-deux-jeu.onrender.com.
- Aucune migration ni modification de données Supabase de production n'a été nécessaire pour ce palier.
- Statut : code et infrastructure livrés. La recette réelle sur téléphones/ordinateurs reste nécessaire ; les tests CI ne simulent pas les appareils physiques.

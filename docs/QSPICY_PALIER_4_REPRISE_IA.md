# QSPICY — dossier de reprise IA · Palier 4

Date : 24 novembre 2026  
Branche de travail : `qspicy/palier-4-invitations-permissions`  
Base : `main`  
Statut : PR #20 fusionnée, migration 17 appliquée et livraison Render documentée ; [recette terrain](QSPICY_RECETTE_TERRAIN.md) encore ouverte.

## 1. Définition du palier 4 retrouvée dans la feuille de route

Le palier 4 porte sur les invitations et permissions :
- distinguer les rôles hôte et invité ;
- chaque participant choisit un seul centre d'intérêt ;
- QSPICY combine les intérêts individuels pour composer le catalogue de la partie ;
- les réglages de lancement restent sous le contrôle de l'hôte ;
- intégrer le statut VIP 1 / Pass Hôte ;
- notifier l'hôte des arrivées et départs.

Décision produit retrouvée : l'hôte crée/configure la salle et invite ; chaque invité choisit un seul intérêt ; le jeu fournit les questions et défis ; les modifications de configuration par un invité sont réservées au statut VIP 1.

## 2. État initial observé sur main

- Les liens d'invitation par UUID de salle existaient déjà.
- Les sièges sont stables : siège 1 = hôte ; siège 2 = invité en Couple ; sièges 2 à 4 = invités en DUOS.
- Les notifications d'arrivée, de départ et de retour existaient déjà sous forme de toasts, déclenchés par comparaison des snapshots.
- Les préférences de catégories étaient des tableaux multi-sélection.
- Les moteurs Couple/DUOS calculaient une intersection des catégories : deux participants ayant choisi des intérêts différents pouvaient donc bloquer le lancement.
- Le client masquait déjà le bouton de lancement en mode Personnalisé pour l'invité, mais les RPC `start_game_by_level` et `start_duo_game_by_level` n'imposaient pas le rôle hôte côté serveur. Un invité pouvait appeler directement ces fonctions.
- Le rôle hôte est déterminé par le siège 1 et doit être vérifié côté serveur, jamais seulement dans React.

## 3. Modifications déjà poussées sur cette branche

### Frontend
- Ajout de `getSelectedInterests` : combine les intérêts individuels sans exiger une intersection.
- Création de salle : l'hôte démarre avec un seul intérêt sélectionné.
- Sélection de catégories remplacée par un choix unique (radio) dans Couple et DUOS.
- Les lobbies affichent clairement HÔTE / INVITÉ.
- Le lien d'invitation et le bouton de lancement sont visibles uniquement pour l'hôte.
- Les invités voient un statut d'attente ; ils gardent le contrôle de leur intérêt et de leurs permissions personnelles.
- Le message d'arrivée côté hôte indique explicitement qu'une invitation a été acceptée.
- Les textes de consentement 18+ sont génériques afin de ne pas afficher un niveau local différent de celui choisi par l'hôte.

### Supabase
Fichier : `supabase/17_invitation_permissions.sql`
- Valeur par défaut d'un nouvel intérêt : `decouverte`.
- Normalisation des salons encore en attente : conservation du premier intérêt choisi, sans toucher aux parties en cours.
- `set_player_categories` accepte exactement un intérêt.
- `start_game_by_level` : siège 1 obligatoire, Couple uniquement, pool calculé sur l'union des intérêts.
- `start_duo_game_by_level` : siège 1 obligatoire, quatre joueurs requis, pool calculé sur l'union des intérêts des quatre participants.
- `start_custom_game` : validation des cartes contre l'union des intérêts individuels.
- Ancien RPC `start_game(uuid,text,text[])` révoqué : le client actuel utilise le moteur par niveau.
- Droits EXECUTE révoqués puis réattribués explicitement à `anon` uniquement pour les RPC conservés ; l'authentification reste le jeton de joueur validé par `_player_for`.

### Tests
Fichier : `supabase/tests/palier4_invitation_permissions.py`
- Un intérêt unique imposé.
- Un invité ne peut pas lancer une partie Couple.
- Deux intérêts différents sont acceptés par le moteur Couple.
- Un invité ne peut pas lancer une partie DUOS.
- Quatre intérêts différents sont acceptés par le moteur DUOS.
- Le Personnalisé peut sélectionner des cartes issues des deux intérêts.
- L'ancien RPC non gradué n'est plus exécutable par anon.

Le test est branché dans `supabase/tests/run_postgres.sh`, après les migrations 16 et 17.

## 4. VIP 1 / Pass Hôte — backend existant, intégration client manquante

La décision produit la plus récente retrouvée :
- Pass Hôte : **750 FCFA (750 XOF) pour 15 jours** ;
- renouvellement manuel, aucun prélèvement automatique ;
- seul l'hôte paie ; les invités rejoignent gratuitement ;
- à expiration, les nouvelles créations de salle sont bloquées ; une partie déjà commencée peut aller à son terme ;
- l'accès Premium / IMMERSION est lié à l'abonnement actif de l'hôte.

### Ce qui existe déjà dans Supabase
- Tables `public.host_payments` et `public.host_subscriptions` présentes ; paiements en XOF, fournisseur FedaPay, montant par défaut 750.
- Edge Functions actives :
  - `create-host-checkout` (JWT requis) ;
  - `verify-host-payment` (JWT requis) ;
  - `fedapay-webhook` (signature FedaPay vérifiée, JWT non requis).
- Le code de ces fonctions exige un compte non anonyme, e-mail et téléphone vérifiés, téléphone béninois `+229`, et confirme 750 XOF pour 15 jours avant d'activer l'abonnement.
- RLS des tables de paiement/abonnement : lecture limitée à l'utilisateur authentifié propriétaire.
- État observé le 24 novembre 2026 : zéro utilisateur Auth non anonyme, zéro utilisateur anonyme, zéro paiement et zéro abonnement.

### Ce qui manque encore
- Le client QSPICY n'utilise pas Supabase Auth : `src/supabase.ts` configure `persistSession: false`; `src/api.ts` n'appelle ni `supabase.auth` ni `supabase.functions.invoke`.
- Aucun parcours UI téléphone OTP + e-mail vérifié n'est branché.
- `create_room` et `create_duo_room` n'exigent pas encore un abonnement actif ; le Pass Hôte n'est donc pas appliqué au lancement du produit.
- Le retour FedaPay et l'affichage du statut d'abonnement ne sont pas intégrés à l'application.
- Les secrets FedaPay et la configuration du fournisseur SMS/SMTP ne peuvent pas être confirmés depuis le code ; les vérifier par un vrai parcours de test sans exposer les valeurs.

### Reprise technique pour l'agent suivant
1. Ajouter un parcours compte hôte avec téléphone OTP + e-mail vérifié, conformément aux exigences déjà codées dans les Edge Functions.
2. Persister la session Auth du compte hôte sans transformer les invités en comptes payants.
3. Connecter `create-host-checkout`, `verify-host-payment` et l'état `host_subscriptions` au parcours d'inscription/paiement.
4. Ajouter `host_user_id` à la salle et contrôler côté RPC le propriétaire et l'abonnement actif à la création. Les invités restent anonymes et gratuits.
5. Définir précisément la règle d'expiration : bloquer les nouvelles salles et les nouveaux lancements/rejouer si le pass est expiré, mais ne pas interrompre une session déjà commencée.
6. Accorder les droits RPC `authenticated` uniquement aux fonctions nécessaires à l'hôte ; ne pas faire un `GRANT` global. Les RPC de jeu doivent continuer à valider le jeton de joueur avec `_player_for`.
7. Tester un vrai compte +229, les deux OTP, un paiement FedaPay sandbox approuvé, le webhook, le renouvellement manuel et un invité sans compte.

Ne pas déclarer VIP 1 / Pass Hôte livré avant ce parcours complet. Ne pas changer le prix : 750 FCFA / 15 jours est la décision utilisateur la plus récente retrouvée.
 
## 5. Notifications — portée réelle

Les notifications de présence actuelles sont des toasts dans l'application, déclenchés par le polling des snapshots. Elles ne préviennent pas un hôte lorsque son navigateur est fermé. Les notifications push/web push nécessitent un service worker, un opt-in, un canal d'envoi serveur et une stratégie de consentement ; ne pas les présenter comme existantes.

## 6. Vérifications et livraison

### Déjà vérifié le 24 novembre 2026
- PR #20 fusionnée dans main : commit `5f0ffe237123a57fcb024d07e904338d771e7d8f`.
- GitHub Actions run `45364829560` : TypeScript, tests unitaires/catalogue, build et intégration PostgreSQL 16 réussis, y compris la migration 17 et ses tests.
- Migration `17_invitation_permissions.sql` appliquée au projet Supabase `xqvxorvvjmwzpcqmqnqv`.
- Vérification SQL : défaut de `selected_categories` = `['decouverte']` ; aucun joueur actif des salons en attente ne conserve plusieurs intérêts ; les 16 joueurs des parties déjà en cours avec plusieurs catégories n'ont pas été modifiés.
- Droits RPC vérifiés : les trois moteurs de lancement restent exécutables par `anon` uniquement et refusent `authenticated` ; l'ancien `start_game` non gradué n'est plus exécutable.
- Render `dep-dc2lhgk9v7es73d0lnlg` : statut `live`, build terminé, aucun log d'erreur applicatif observé après le déploiement.
- Supabase Advisors : 24 avertissements génériques sur des fonctions SECURITY DEFINER exécutables par anon (les RPC de jeu reposent sur les jetons de joueur et doivent être revus individuellement) ; deux avertissements de performance RLS et deux index inutilisés. Ne pas faire de GRANT global ni retirer les RPC de jeu sans audit de chaque fonction.

### Recette manuelle encore nécessaire
Créer une salle avec deux appareils ; vérifier hôte/invité, intérêts différents, consentement 18+, lancement par l'hôte seul, notifications d'arrivée et de départ. Refaire avec quatre appareils pour DUOS. Aucun test réel multi-appareils n'a été effectué par l'agent.

## 7. Limites et reprise

- Le Pass Hôte / VIP 1 n'est pas implémenté.
- Aucune notification push n'est implémentée.
- PR #20 fusionnée dans main : commit 5f0ffe237123a57fcb024d07e904338d771e7d8f.
- Migration 17 appliquée à Supabase le 24 novembre 2026 ; droits des RPC de lancement vérifiés : anon uniquement pour les RPC de jeu, ancien start_game non gradué fermé.
- Seule la recette terrain reste à confirmer avant de déclarer la livraison complète.
- VIP 1 / Pass Hôte : backend FedaPay actif, mais intégration Auth/checkout/contrôle d'abonnement dans le client et les RPC de création encore à réaliser.

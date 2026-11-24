# QSPICY — dossier de reprise IA · Palier 4

Date : 24 novembre 2026  
Branche de travail : `qspicy/palier-4-invitations-permissions`  
Base : `main`  
Statut : implémentation en cours, non fusionnée, non migrée en production, non déployée.

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

## 4. VIP 1 / Pass Hôte — blocage identifié, ne pas simuler

Décision de monétisation antérieure : seul l'hôte paie ; les invités rejoignent gratuitement. Le Pass Hôte a été envisagé à 1 000 FCFA pour 30 jours ; l'expiration bloque les nouvelles créations, mais une partie déjà commencée peut aller à son terme.

Le dépôt actuel indique encore « sans compte » et ne dispose pas d'une identité utilisateur persistante. Il n'existe pas de système fiable pour associer un paiement à un hôte, vérifier une période d'abonnement et contrôler un droit VIP 1 depuis Supabase. Un simple champ modifiable par le client ou un booléen local serait contournable.

Ne pas prétendre que VIP 1 est livré. Pour l'implémenter proprement, il faudra :
1. choisir une identité persistante (Supabase Auth, idéalement OTP/magic link selon le parcours retenu) ;
2. lier le Pass Hôte à `auth.uid()`, et non au siège éphémère d'une salle ;
3. définir le moyen de confirmation du paiement (webhook fournisseur ou validation administrative auditée) ;
4. enregistrer côté serveur `starts_at`, `expires_at`, statut et référence de paiement sans stocker de données sensibles inutiles ;
5. vérifier le droit côté RPC de création et de modification, jamais dans le seul frontend ;
6. préserver l'accès gratuit des invités et la fin des parties déjà commencées après expiration.

Tant que ces dépendances ne sont pas prêtes, le comportement sûr reste : hôte seul maître du niveau et du lancement ; invité choisit son intérêt et ses autorisations personnelles, sans modifier les réglages de la salle.

## 5. Notifications — portée réelle

Les notifications de présence actuelles sont des toasts dans l'application, déclenchés par le polling des snapshots. Elles ne préviennent pas un hôte lorsque son navigateur est fermé. Les notifications push/web push nécessitent un service worker, un opt-in, un canal d'envoi serveur et une stratégie de consentement ; ne pas les présenter comme existantes.

## 6. Vérifications et livraison

À faire sur cette branche :
1. Exécuter `npm test` et `npm run build`.
2. Exécuter `bash supabase/tests/run_postgres.sh` sur PostgreSQL 16.
3. Corriger toute erreur avant PR.
4. Revoir les privilèges RPC et exécuter les Supabase Advisors.
5. Fusionner uniquement après CI verte.
6. Appliquer migration 17 en production après revue des requêtes de normalisation des seuls salons en attente.
7. Déployer Render depuis `main`, puis vérifier le statut `live`.

À tester manuellement : créer une salle avec deux appareils ; vérifier hôte/invité, intérêts différents, consentement 18+, lancement par l'hôte seul, notifications d'arrivée et de départ. Refaire avec quatre appareils pour DUOS.

## 7. Limites et reprise

- Le Pass Hôte / VIP 1 n'est pas implémenté.
- Aucune notification push n'est implémentée.
- Aucun changement Supabase de production n'a été effectué dans ce palier.
- Aucun déploiement Render n'a été déclenché.
- Ne pas fusionner ni appliquer la migration 17 avant CI complète.

# QSPICY — comptes hôtes et paiements

## Règles produit

- L'hôte doit avoir un compte permanent, avec téléphone béninois et e-mail tous deux vérifiés.
- Connexion possible par OTP SMS ou OTP e-mail ; les deux identifiants sont liés au même utilisateur Supabase.
- Les invités rejoignent une salle sans compte et sans paiement.
- Un paiement unique de **750 FCFA (XOF)** ouvre **15 jours** d'accès hôte.
- Aucun renouvellement automatique.
- Les créations de salles couple et DUOS sont contrôlées dans PostgreSQL : compte vérifié + abonnement actif obligatoires.

## Configuration Supabase Auth à faire avant les essais

Dans Supabase Dashboard → Authentication → Providers :

1. Activer Phone.
2. Configurer un fournisseur SMS compatible (Twilio, Vonage ou MessageBird) et vérifier la livraison réelle au Bénin avant ouverture publique.
3. Garder Email activé.
4. Dans Authentication → Email Templates, configurer **Magic Link** pour envoyer un code OTP avec `{{ .Token }}` (et non uniquement un lien).
5. Configurer aussi le modèle **Change Email Address** avec `{{ .Token }}`, car l'ajout de l'e-mail à un compte téléphone passe par la vérification `email_change`.
5. Dans Authentication → URL Configuration, ajouter `https://a-deux-jeu.onrender.com` comme Site URL et Redirect URL autorisée.

Les clés API du fournisseur SMS restent dans les réglages Supabase, jamais dans le dépôt.

## Secrets Edge Functions

Dans Supabase Dashboard → Edge Functions → Secrets, configurer :

- `FEDAPAY_SECRET_KEY` : clé API secrète **sandbox** au départ.
- `FEDAPAY_WEBHOOK_SECRET` : secret propre au webhook FedaPay.
- `FEDAPAY_ENVIRONMENT=sandbox`.

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis par l'environnement Supabase Edge Functions. Ne jamais exposer la clé service_role dans le navigateur ou dans Git.

## FedaPay sandbox

Créer un webhook dans le tableau de bord FedaPay, pointant vers :

`https://xqvxorvvjmwzpcqmqnqv.supabase.co/functions/v1/fedapay-webhook`

Événements à écouter : `transaction.approved`, `transaction.canceled` et, si disponible pour le compte, `transaction.refunded`.

Copier le secret du webhook dans `FEDAPAY_WEBHOOK_SECRET`. Le secret du webhook sandbox est distinct du secret de production.

## Fonctions déployées par le code

- `create-host-checkout` : exige un JWT hôte, deux coordonnées vérifiées et crée une transaction de 750 XOF en sandbox/live selon le secret serveur.
- `verify-host-payment` : vérifie le statut directement auprès de l'API FedaPay après le retour du paiement ; le statut de l'URL de retour n'est jamais cru.
- `fedapay-webhook` : vérifie la signature HMAC FedaPay sur le corps brut, relit la transaction auprès de l'API et active l'accès de façon idempotente.

## Migrations

À appliquer dans l'ordre après revue :

- `10_host_billing.sql` : tables de paiements et abonnements, RLS en lecture seule pour le propriétaire.
- `11_host_creation_gate.sql` : bloque la création de salle sans compte hôte vérifié et abonnement actif. Les RPC de jonction restent publiques pour les invités.

Ne pas appliquer la migration 11 avant d'avoir déployé la nouvelle version front-end : elle bloque volontairement la création de nouvelles salles par les anciens clients anonymes.

## Passage en production

Ne remplacer `FEDAPAY_SECRET_KEY` par la clé live et `FEDAPAY_ENVIRONMENT=live` qu'après :
- tests sandbox sur MTN, Moov et Celtiis selon les moyens activés par le compte marchand ;
- vérification de la livraison des OTP SMS et e-mail ;
- test d'un paiement approuvé, annulé, doublé et d'un webhook rejoué ;
- vérification qu'un paiement de 750 XOF active exactement 15 jours et qu'un paiement inférieur/supérieur ou en devise différente n'active rien.

Aucun renouvellement automatique n'est prévu.

# QSPICY — dossier de reprise IA · Palier 5

Date : 24 novembre 2026  
Branche active : `qspicy/palier-5-gallery-photos`  
Base : `main`  
Statut : nettoyage des confidences fusionné ; partage de photos depuis la galerie en cours de validation. Aucun déploiement de la nouvelle fonction photo ni migration de production effectué.

## 1. Décision produit confirmée

QSPICY doit permettre aux joueurs de s'envoyer des photos personnelles choisies depuis la galerie du téléphone ou de l'ordinateur, avant et pendant une partie. Les illustrations Tao/Naya restent les avatars du jeu : les photos personnelles sont des médias partagés dans la salle, pas des photos de profil.

Parcours prévu :
1. Ouvrir « Photos personnelles » dans la salle, y compris avant le lancement.
2. Choisir une photo dans la galerie (sélecteur `image/*`, sans forcer l'appareil photo).
3. Prévisualiser la photo.
4. Confirmer explicitement l'envoi et la destination.
5. Le destinataire autorisé voit la photo dans la galerie privée de la salle.
6. L'expéditeur peut supprimer sa photo ; les photos expirent après six heures et sont nettoyées à la fin de la partie ou lorsqu'un joueur quitte la salle.

## 2. Règles de partage et consentement

- Couple : envoi au partenaire uniquement ; le partenaire doit avoir activé « J'accepte de recevoir les photos de mon partenaire ».
- DUOS : envoi dans son propre duo ; le destinataire doit avoir activé la réception des médias.
- Espace commun DUOS : disponible uniquement si les quatre participants ont autorisé les interactions croisées et si tous les destinataires acceptent les photos.
- L'accord de réception peut être retiré à tout moment ; les photos reçues ne sont alors plus listées pour la personne qui a retiré son accord.
- Une photo est un partage volontaire : l'aperçu et le bouton de confirmation précèdent l'envoi.
- Une capture d'écran ou une photographie de l'écran du destinataire ne peut pas être empêchée de façon garantie par une application web.

## 3. Sécurité prévue et implémentée dans la branche

- Bucket Supabase privé `qspicy-private-media`, jamais public.
- Formats autorisés : JPEG, PNG et WebP uniquement ; taille maximale : 5 Mo.
- Le navigateur réencode la photo en JPEG, réduit sa taille à 1600 px maximum et retire les métadonnées EXIF avant l'envoi.
- L'Edge Function `qspicy-room-media` valide le jeton de joueur, la salle, la destination, les autorisations, le type réel du fichier et sa taille.
- Les clients n'ont aucun droit direct d'écriture ou de lecture sur la table `room_media` ni sur les objets Storage.
- Les téléchargements passent par des URL signées de cinq minutes.
- Noms de fichiers opaques et aléatoires ; aucun pseudo ni nom d'origine dans le chemin.
- Limites temporaires : 20 photos actives maximum par salle, 8 par expéditeur, et 8 envois par minute.
- Suppression autorisée à l'expéditeur ; suppression globale lors de la fin de partie et du départ volontaire. Nettoyage opportuniste des fichiers expirés lors des consultations.
- Migration : `supabase/18_room_photo_sharing.sql`.
- Edge Function : `supabase/functions/qspicy-room-media/index.ts`.
- Interface : `src/components/PhotoShare.tsx`, montée dans les salles d'attente et de jeu.
- API : `getRoomPhotos`, `uploadRoomPhoto`, `deleteRoomPhoto`, `setRoomMediaPermission`, `clearRoomPhotos`.

## 4. Architecture de validation serveur

La migration ajoute `room_media`, active RLS et révoque l'accès direct. Les RPC sensibles vérifient le jeton de joueur via `_player_for`. Seule l'Edge Function, exécutée avec la clé serveur conservée côté Supabase, peut enregistrer ou signer les médias. La clé serveur n'est jamais envoyée au navigateur.

Le bucket est privé et limité aux types MIME autorisés. La fonction vérifie les signatures binaires JPEG/PNG/WebP, puis revalide les droits au moment de l'enregistrement. Les URL signées expirent après cinq minutes ; supprimer le fichier retire l'accès futur.

## 5. Livraisons déjà validées

- PR #21 fusionnée : https://github.com/dodjust229/--deux-/pull/21
  - nettoyage des confidences locales de la salle quittée ;
  - test unitaire confirmant qu'une autre salle et la clé de session ne sont pas supprimées.
- PR #22 fusionnée : https://github.com/dodjust229/--deux-/pull/22
  - nettoyage centralisé dans `dropSession()`, y compris les fermetures déclenchées par une erreur fatale ;
  - CI réussie : TypeScript, tests unitaires, build et intégration PostgreSQL 16.
- Commit de fusion PR #22 : `43017701c5821b8ce24139a57944375f90143b00`.

## 6. Tests et vérifications à effectuer sur la nouvelle fonctionnalité

Le nouveau test SQL `supabase/tests/photo_sharing.sql` vérifie :
- refus d'envoi si le destinataire n'a pas accepté ;
- autorisation après consentement ;
- visibilité pour le destinataire et l'expéditeur ;
- refus de suppression par un destinataire non propriétaire ;
- suppression par l'expéditeur et disparition de la liste.

Le script `supabase/tests/run_postgres.sh` applique maintenant la migration 18 et exécute ce test. La CI de la branche doit encore confirmer la migration, TypeScript, les tests et le build.

Recette manuelle multi-appareils encore requise :
- choisir une photo dans la galerie mobile et sur ordinateur ;
- tester Couple et DUOS ;
- refuser puis accepter la réception ;
- vérifier que le groupe DUOS est bloqué tant qu'un seul joueur n'a pas donné son accord ;
- retirer l'autorisation après réception ;
- supprimer une photo depuis l'expéditeur ;
- vérifier le nettoyage à la fin et au départ d'une salle.

## 7. État exact de production

- Les PR #21 et #22 sont fusionnées.
- La nouvelle migration 18 n'a pas encore été appliquée au projet Supabase de production.
- Le bucket privé n'a pas encore été créé en production.
- L'Edge Function `qspicy-room-media` n'a pas encore été déployée.
- Le partage photo n'est donc pas encore disponible sur l'application publique.
- Ne pas déclarer le Palier 5 terminé avant CI verte, migration et Edge Function déployées, vérification Render et recette réelle sur plusieurs appareils.

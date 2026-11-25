# QSPICY — dossier de reprise IA · Palier 5

Date : 24 novembre 2026  
Branche livrée : `qspicy/palier-5-gallery-photos` (fusionnée dans `main`)  
Commit de livraison : `6bdfb67a522e1a0c8b625d3ddf9d3a8102cefb42`  
Statut : code, migration Supabase, Edge Function et déploiement Render livrés ; recette manuelle multi-appareils encore requise.

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
- L'accord de réception peut être retiré à tout moment ; les destinataires sont alors retirés définitivement des photos déjà partagées. Réactiver l'autorisation ne fait pas réapparaître les anciens médias.
- Une photo est un partage volontaire : l'aperçu et le bouton de confirmation précèdent l'envoi.
- Une capture d'écran ou une photographie de l'écran du destinataire ne peut pas être empêchée de façon garantie par une application web.

## 3. Sécurité prévue et implémentée dans la branche

- Bucket Supabase privé `qspicy-private-media`, jamais public.
- Format autorisé côté serveur : JPEG uniquement (toutes les images choisies sont réencodées en JPEG par le navigateur) ; taille maximale : 5 Mo.
- Le navigateur réencode la photo en JPEG, réduit sa taille à 1600 px maximum et retire les métadonnées EXIF avant l'envoi ; l'Edge Function vérifie la signature JPEG et bloque les dimensions supérieures à 4000 px ou 16 mégapixels.
- L'Edge Function `qspicy-room-media` valide le jeton de joueur, la salle, la destination, les autorisations, le type réel du fichier et sa taille.
- Les clients n'ont aucun droit direct d'écriture ou de lecture sur la table `room_media` ni sur les objets Storage.
- Les téléchargements passent par des URL signées de cinq minutes.
- Noms de fichiers opaques et aléatoires ; aucun pseudo ni nom d'origine dans le chemin.
- Limites temporaires : 20 photos actives maximum par salle, 8 par expéditeur, et 8 envois par minute.
- Suppression autorisée à l'expéditeur ; suppression globale lors de la fin de partie et du départ volontaire. Nettoyage global des fichiers expirés au démarrage de l'application et lors des consultations photo ; les références restent présentes après purge de la salle pour permettre ce nettoyage. Si tous les navigateurs ferment brutalement, les fichiers restent privés et les URL signées expirent, puis le nettoyage physique est déclenché à la prochaine ouverture de QSPICY.
- Migration : `supabase/18_room_photo_sharing.sql`.
- Edge Function : `supabase/functions/qspicy-room-media/index.ts`.
- Interface : `src/components/PhotoShare.tsx`, montée dans les salles d'attente et de jeu.
- API : `getRoomPhotos`, `uploadRoomPhoto`, `deleteRoomPhoto`, `setRoomMediaPermission`, `clearRoomPhotos`, `cleanupExpiredRoomPhotos`.
- Nettoyage global public `action=cleanup_expired` : ne retourne aucune photo, supprime uniquement les objets dont l'expiration de six heures est atteinte.

## 4. Architecture de validation serveur

La migration ajoute `room_media`, active RLS et révoque l'accès direct. Les RPC sensibles vérifient le jeton de joueur via `_player_for`. Seule l'Edge Function, exécutée avec la clé serveur conservée côté Supabase, peut enregistrer ou signer les médias. La clé serveur n'est jamais envoyée au navigateur.

Le bucket est privé et limité au JPEG. La fonction vérifie le type réel du fichier, puis revalide les droits au moment de l'enregistrement. Les URL signées expirent après cinq minutes ; supprimer le fichier retire l'accès futur. Après une révocation, vérifier séparément l'accès déjà accordé et l'absence du média dans la galerie ([cas 5.3](QSPICY_RECETTE_TERRAIN.md)).

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

Le script `supabase/tests/run_postgres.sh` applique la migration 18 et exécute les recettes Couple + DUOS. CI GitHub Actions réussie sur le commit final : TypeScript, tests unitaires, build et intégration PostgreSQL 16 (run `45370514524`).

Recette manuelle multi-appareils encore requise :
- choisir une photo dans la galerie mobile et sur ordinateur ;
- tester Couple et DUOS ;
- refuser puis accepter la réception ;
- vérifier que le groupe DUOS est bloqué tant qu'un seul joueur n'a pas donné son accord ;
- retirer l'autorisation après réception ;
- supprimer une photo depuis l'expéditeur ;
- vérifier le nettoyage à la fin et au départ d'une salle.

## 7. État exact de production

- PR #21 : https://github.com/dodjust229/--deux-/pull/21 — fusionnée.
- PR #22 : https://github.com/dodjust229/--deux-/pull/22 — fusionnée.
- PR #23 : https://github.com/dodjust229/--deux-/pull/23 — fusionnée.
- Migration Supabase `qspicy_room_photo_sharing` appliquée au projet de production.
- Vérification production : bucket `qspicy-private-media` présent, `public=false`, JPEG uniquement, limite 5 242 880 octets ; RLS activée sur `public.room_media` ; 0 média stocké à la livraison.
- RPC sensibles : lecture/enregistrement/suppression réservés à `service_role` ; seules les fonctions de consentement tokenisées sont accessibles à `anon`.
- Edge Function `qspicy-room-media` : ACTIVE, version 1, `verify_jwt=false` car les RPC valident le jeton de joueur. L'action publique `cleanup_expired` ne fait que supprimer les médias expirés et ne retourne aucun média.
- Render : déploiement `dep-dc2m1ee8bjmc738425s0`, commit `6bdfb67a522e1a0c8b625d3ddf9d3a8102cefb42`, statut `live`.
- Application : https://a-deux-jeu.onrender.com

## 8. Recette manuelle restant à faire

Le code et l'infrastructure sont en production, mais aucune vraie photo n'a encore été envoyée depuis deux appareils dans cette session. À vérifier sur téléphone + ordinateur ou deux téléphones :
- Couple : consentement du partenaire, sélection galerie, aperçu, envoi et affichage.
- DUOS : envoi au duo privé ; vérifier qu'un joueur de l'autre duo ne voit rien.
- Espace commun : vérifier le blocage sans les quatre consentements.
- Retrait du consentement : l'accès aux anciennes photos ne doit pas revenir après réactivation.
- Suppression par l'expéditeur.
- Fin de partie et départ volontaire : les médias sont nettoyés.
- Ouverture de QSPICY : le nettoyage des photos expirées est déclenché.

Limite connue : si tous les navigateurs ferment brutalement, les photos restent dans le bucket privé jusqu'au prochain démarrage de l'application ou à une prochaine consultation photo. Les URL signées expirent après cinq minutes et les médias ne sont plus listés après six heures. Aucun cron externe de nettoyage n'est configuré à ce stade.

Ne pas refaire l'audit initial : reprendre directement à cette recette manuelle, puis passer au Palier 6.

# QSPICY — dossier de reprise IA · Palier 5

Date : 24 novembre 2026  
Branche : `qspicy/palier-5-photos-confidentialite`  
Base : `main`  
Statut : audit initial réalisé ; aucune fonctionnalité photo activée et aucune migration appliquée.

## 1. Objet du palier

Le palier 5 concerne les photos et la confidentialité. Pour QSPICY, le bon objectif n'est pas d'ajouter immédiatement un téléversement d'images : il faut d'abord définir ce que les joueurs peuvent partager, avec qui, pendant combien de temps, et comment ils peuvent retirer leur contenu.

Le cahier des charges du dépôt demande des personnages illustrés originaux et précise de ne pas utiliser de photographies de personnes réelles comme avatars. Cette orientation doit être préservée.

## 2. Audit constaté dans le dépôt

### Images et avatars
- Les avatars de joueurs sont des choix de persona (`masculin` / `feminin`) rendus par le composant SVG `src/components/Character.tsx`.
- Tao et Naya sont des illustrations vectorielles originales ; aucune photo de profil utilisateur n'est téléversée ou stockée.
- Les visuels de marque présents dans `public/brand/` sont des ressources statiques du produit, pas des photos privées de joueurs.

### Médias dans le jeu
- `src/lib/media.ts` prend en charge le texte, une réponse privée et un marqueur de média historique.
- Les anciens stickers et GIF sont explicitement retirés ; `src/components/MediaContent.tsx` affiche un fallback au lieu d'essayer de charger une URL historique.
- Le compositeur `src/components/Composer.tsx` sauvegarde le texte d'une réponse « privée » dans le `localStorage` du navigateur sous le préfixe `qspicy.privee.`, puis n'envoie au serveur que le marqueur `qs1:privee:`.
- Le texte privé brut n'est donc pas transmis dans la réponse RPC, mais il reste sur l'appareil dans le stockage local du navigateur. Aucun mécanisme de nettoyage automatique de ces clés n'a été confirmé dans l'audit initial. Sur un appareil partagé, ce stockage persistant représente un risque de confidentialité.

### Permissions DUOS
- La table `duo_permissions` possède `receive_media` et `share_answers`, avec une valeur par défaut `false`.
- Ces champs existent dans le modèle, mais l'audit n'a trouvé aucun flux de téléversement, de distribution ou de rendu de photos qui les exploite.
- Ne pas interpréter `receive_media = false` comme une protection complète d'une fonction photo : aucune fonction photo n'est actuellement implémentée.

## 3. État observé dans Supabase en production

Projet : `xqvxorvvjmwzpcqmqnqv`.

- Aucun bucket Storage n'est actuellement configuré (requête sur `storage.buckets` : résultat vide).
- Aucune politique Storage personnalisée n'a été trouvée dans les politiques RLS examinées.
- Les tables applicatives `answers`, `players`, `rooms`, `duo_messages` et `duo_permissions` ne sont pas directement accessibles via des politiques publiques permissives : les politiques observées sur les tables de jeu sont des refus d'accès direct, les opérations passent par les RPC prévues.
- La table `answers` stocke les réponses textuelles, le statut passé et l'horodatage ; elle ne comporte pas de colonne de fichier/photo.
- `players` stocke un choix d'avatar textuel, pas une URL d'image.
- `duo_messages` stocke un type de message et un corps textuel ; aucun champ de fichier ou de métadonnées d'image n'a été constaté.

Conclusion : il n'existe actuellement ni dépôt de photos de joueurs ni infrastructure Storage exposée pour les recevoir. C'est un état plus sûr que d'activer un bucket public par défaut.

## 4. Décisions de sécurité à conserver

1. Conserver Tao et Naya comme avatars illustrés ; ne pas ajouter de photos réelles de profil.
2. Ne jamais utiliser un bucket public pour des photos privées de joueurs.
3. Ne pas exposer d'URL permanente ou de lien public pour un média privé.
4. Ne jamais faire confiance à un simple booléen React ou à `receive_media` pour autoriser un upload.
5. Chaque envoi éventuel doit être volontaire, précédé d'un aperçu et d'une confirmation explicite.
6. Le consentement doit être granulaire : recevoir des médias, partager un média, et visibilité de ce média sont des décisions distinctes.
7. Prévoir retrait/suppression, durée de conservation courte et nettoyage automatique des fichiers orphelins.
8. Afficher clairement qu'aucune application web ne peut empêcher de façon garantie une capture d'écran ou une photographie de l'écran par un autre appareil.

## 5. Architecture recommandée si le partage de photos est confirmé comme fonctionnalité produit

Ne pas implémenter avant validation de la règle produit et du parcours de consentement.

- Créer un bucket Supabase **privé** dédié aux médias de jeu, avec limite de taille stricte et liste MIME autorisée (JPEG, PNG, WebP uniquement ; SVG et HTML interdits).
- Les clients ne doivent pas disposer d'un droit direct d'upload fondé uniquement sur un identifiant de salle. Les joueurs actuels s'authentifient par jeton de joueur applicatif, pas par compte Supabase Auth ; les policies Storage standard basées sur `auth.uid()` ne suffisent donc pas.
- Passer par une Edge Function qui valide le jeton de joueur avec les mêmes règles que les RPC de jeu, vérifie l'appartenance à la salle, l'état de la partie, les permissions des deux côtés et le consentement explicite pour ce média précis.
- Utiliser des URL signées de courte durée pour les transferts et consultations. Ne jamais rendre le bucket public.
- Générer des noms d'objets aléatoires côté serveur ; ne pas inclure le pseudo, le téléphone ou le nom de fichier original dans le chemin.
- Limiter le poids et les dimensions ; réencoder les images côté client avant transfert pour réduire les métadonnées EXIF et la taille. Ne pas accepter de fichiers arbitraires.
- Conserver une table de métadonnées minimale : salle, expéditeur, destinataires autorisés, chemin opaque, type MIME vérifié, taille, date de création et date d'expiration.
- Prévoir une suppression logique immédiate suivie d'une suppression Storage réelle ; la suppression d'un objet doit aussi invalider les accès futurs. Une URL signée déjà créée peut rester utilisable jusqu'à son expiration.
- Définir une rétention courte et un nettoyage serveur planifié. Ne pas garder des photos après la fin de la partie sans consentement distinct.
- Ajouter des tests négatifs : mauvais jeton, joueur d'une autre salle, permission désactivée, consentement absent, fichier trop lourd, MIME falsifié, tentative d'accès après suppression/expiration.

Références Supabase actuelles consultées :
- Contrôle d'accès Storage par RLS : https://supabase.com/docs/guides/storage/security/access-control
- Buckets privés et publics : https://supabase.com/docs/guides/storage/buckets/fundamentals
- URLs signées et limites de révocation : https://supabase.com/docs/guides/storage/serving/downloads

## 6. Confidentialité des réponses privées — correction prioritaire

Le texte des réponses privées est actuellement gardé dans le `localStorage`, mais l'audit initial n'a pas identifié de lecture ou de suppression de ces entrées. Avant d'ajouter des photos, corriger ce cycle de vie :
- déterminer si une confidence doit rester consultable après envoi ou uniquement pendant l'interaction ;
- supprimer les clés du salon au départ du joueur et à la fin de la partie, si cette rétention n'est pas une fonctionnalité explicitement voulue ;
- prévoir un nettoyage des anciennes clés orphelines ;
- ne pas présenter le stockage local comme chiffré ou comme un coffre-fort : tout script exécuté sur la même origine peut y accéder, et l'utilisateur du navigateur peut inspecter ses données.

Correction déjà ajoutée sur la branche de ce palier :
- `clearPrivateAnswers(roomId, storage)` supprime uniquement les clés préfixées par l'identifiant de la salle quittée.
- Le nettoyage est centralisé dans `dropSession()` : il s'exécute lors d'une sortie volontaire et lors d'une fermeture de session provoquée par une erreur fatale, pas uniquement dans le bouton Quitter.
- Un test unitaire vérifie que les confidences d'une autre salle et la clé de session restent intactes.
- CI de la PR #21 : TypeScript, tests unitaires, build et intégration PostgreSQL 16 réussis.

## 7. Tests et preuves

| Vérification | Résultat |
|---|---|
| Inspecter le composant d'avatar | Réussi : avatars SVG Tao/Naya |
| Inspecter le parseur/rendu média | Réussi : texte, confidence privée, fallback média historique |
| Vérifier le stockage des réponses privées | Réussi : texte conservé localement, marqueur seul envoyé au serveur |
| Vérifier les buckets Supabase | Réussi : aucun bucket configuré |
| Vérifier les colonnes de jeu | Réussi : aucune colonne photo/fichier sur les tables examinées |
| Vérifier les politiques RLS examinées | Réussi : refus d'accès direct aux tables de jeu ; aucune politique Storage personnalisée observée |
| Test réel d'envoi/consultation/suppression de photo | Non applicable : fonctionnalité absente |
| Test multi-appareils de partage photo | Non testé : aucun flux photo disponible |
| Garantie anti-capture d'écran | Impossible à garantir dans un navigateur |

## 8. Étapes restantes pour terminer le palier

1. Confirmer dans la spécification produit si QSPICY doit réellement permettre l'envoi de photos entre joueurs, ou si le palier concerne uniquement la confidentialité des réponses et médias.
2. Corriger le cycle de vie des confidences locales et ajouter ses tests.
3. Si le partage photo est confirmé, développer le flux privé complet (consentement par média, Edge Function, bucket privé, URLs temporaires, expiration, suppression et tests de sécurité).
4. Vérifier les permissions DUOS côté serveur, pas seulement dans l'interface.
5. Faire une recette sur deux appareils distincts, avec consentement accepté/refusé, retrait et expiration.

## 9. État de livraison

- Audit initial effectué ; aucun code de partage photo n'a été activé.
- Aucune migration SQL ni création de bucket n'a été effectuée.
- Aucune modification de production n'a été effectuée.
- Correction du nettoyage des confidences locales ajoutée dans `src/lib/media.ts` et appelée depuis `src/App.tsx` ; test ciblé ajouté dans `src/lib/media.test.ts`. CI en attente au moment de la rédaction.
- Le palier 5 ne doit pas être déclaré terminé tant que le cycle de vie des confidences et les permissions médias n'ont pas été corrigés et testés.


## 10. Livraison du nettoyage local

- PR #21 fusionnée dans `main` : https://github.com/dodjust229/--deux-/pull/21
- Commit squash : `dad574467728070819694b5530e27471dd331ecf`.
- CI GitHub Actions : réussite complète (TypeScript, tests, build et intégration PostgreSQL 16).
- Une amélioration complémentaire centralise maintenant le nettoyage dans `dropSession()`, pour couvrir aussi les sorties déclenchées par une erreur fatale de session. Cette modification complémentaire doit passer sa propre CI avant fusion.
- Aucun déploiement n'est déclaré tant que Render ne confirme pas le commit fusionné.

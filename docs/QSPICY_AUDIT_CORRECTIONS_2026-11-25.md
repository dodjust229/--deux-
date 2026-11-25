# QSPICY — Rapport de correction de l’audit technique

**Dépôt :** dodjust229/--deux-  
**Branche source :** release/qspicy-integrated-corrections-v1  
**Branche de correction :** fix/qspicy-audit-regressions-v1  
**Périmètre :** migrations 20, 21, 22, 24 ; moteur Couple, DUOS et Personnalisé.

## Résumé

L'audit du dossier DeepSeek a mis en évidence un défaut réel, mais plusieurs propositions de correction étaient incorrectes ou insuffisamment justifiées.

La correction de cette branche restaure le comportement Audacieux qui existait en migration 20 et qui a été perdu lorsque la migration 21 a remplacé les fonctions de lancement. Elle conserve le plancher explicite de la migration 21 et les contrôles de consentement existants.

Aucune modification n'a été appliquée à Supabase en production. Aucune fusion ni aucun déploiement n'ont été effectués.

## 1. Défaut confirmé : Audacieux disparaît avec un palier technique 2

### Cause

La migration 20 contenait deux mécanismes :
- la fonction _effective_level relevait le niveau technique à 3 lorsque la catégorie audacieux était sélectionnée ;
- le helper _pick_catalog_deck réservait jusqu'à huit cartes audacieux dans un paquet combiné.

La migration 21 a remplacé _effective_level par une version qui respecte explicit_floor, mais a omis la règle audacieux vers niveau 3. Elle a également remplacé l'appel au helper par un tirage aléatoire direct sur le niveau effectif.

Le client transmet actuellement gameLevel égal à 2. Ce choix est cohérent avec la suppression des sélecteurs techniques visibles : le niveau est interne, il ne doit pas être restauré depuis une ancienne préférence locale arbitraire.

### Correction proposée dans la migration 25

- Conserver le plancher de salle explicit_floor.
- Calculer le niveau effectif comme le maximum entre le niveau demandé, le plancher de salle et le niveau 3 si audacieux est sélectionné.
- Réutiliser _pick_catalog_deck de la migration 20 afin de garantir jusqu'à huit cartes Audacieux dans un paquet combiné.
- Appliquer la même règle aux lancements Couple et DUOS.
- Conserver les vérifications de consentement des deux joueurs en Couple et des quatre joueurs en DUOS.
- Préserver les privilèges existants des RPC : aucun GRANT/REVOKE n'est ajouté.

## 2. Redémarrage et consentement : la proposition DeepSeek était incorrecte

### Couple

La fonction restart_game :
- conserve players.adult_consent ;
- remet rooms.adult_enabled à false pendant que la salle revient à l'état waiting ;
- efface les réponses de la partie terminée.

Ce comportement est cohérent : adult_enabled est un état de session, tandis que adult_consent est le choix individuel persistant. Au lancement suivant, le serveur vérifie à nouveau les consentements et réactive adult_enabled si les deux accords sont toujours valides.

Il n'est donc pas nécessaire d'appeler _sync_adult au redémarrage. Le faire pendant l'attente confondrait consentement conservé et session effectivement lancée.

### DUOS

DUOS utilise une autre fonction, restart_duo_game. Après les quatre votes de revanche, elle remet les consentements à false pour que les quatre participants donnent un nouvel accord pour la nouvelle partie.

Ce comportement est volontaire et distinct du redémarrage Couple. La migration 25 ne le modifie pas.

## 3. Personnalisé

Le mode Personnalisé utilise start_custom_game et reçoit une liste explicite d'identifiants du catalogue. Le serveur vérifie :
- que les cartes appartiennent aux catégories choisies ;
- que la sélection contient entre 5 et 24 identifiants uniques ;
- que les deux joueurs ont consenti si le paquet contient une carte de niveau 3–4 ou une carte Audacieux.

Le problème de niveau Audacieux dans les lancements automatiques Couple/DUOS ne justifie pas de réécrire cette fonction. La migration 25 ne la modifie pas.

## 4. Sessions trop courtes : anomalie confirmée, non corrigée dans cette branche

Le catalogue maître V2 contient seulement **2 cartes Découverte au niveau technique 2**. Les fonctions de lancement sélectionnent les cartes au niveau technique exact. Lorsque les deux joueurs choisissent Découverte avec le niveau interne 2, le paquet peut donc ne contenir que deux questions.

C'est une vraie anomalie de volume, mais la corriger exige une décision de conception : faut-il mélanger des cartes de plusieurs niveaux techniques, modifier le niveau interne par défaut, ou enrichir le catalogue au niveau concerné ?

La migration 21 utilise aussi explicit_floor comme plancher absolu. Mélanger automatiquement des cartes de niveau inférieur sans revoir cette règle pourrait contourner la progression explicite. Cette branche ne change donc pas silencieusement cette architecture.

Le problème est documenté et doit faire l'objet d'une correction dédiée, accompagnée de tests sur les cinq catégories et les quatre niveaux.

## 5. Préférences locales

Le fichier src/lib/prefs.ts fixe gameLevel à 2 dans sanitizePreferences. Cela évite de réintroduire les anciens paliers cachés depuis des préférences locales obsolètes. Le patch DeepSeek qui conserve un ancien gameLevel valide ne corrige pas le défaut Audacieux et pourrait réactiver des valeurs techniques qui ne sont plus exposées dans l'interface.

Aucune modification de prefs.ts n'est donc incluse.

## 6. Fichiers modifiés

- supabase/25_audacieux_floor_and_deck.sql : migration additive de correction.
- supabase/tests/audit_regressions.sql : recette SQL exécutée après les migrations 21, 22, 24 et 25.
- supabase/tests/run_postgres.sh : intégration de la migration et de la recette à la chaîne PostgreSQL CI.
- supabase/README.md : ordre d'application et explication des limites restantes.
- docs/QSPICY_AUDIT_CORRECTIONS_2026-11-25.md : présent rapport.

Aucun fichier frontend, aucune donnée de catalogue et aucune fonction de redémarrage ne sont modifiés.

## 7. Vérifications attendues

La recette ajoutée vérifie :
- audacieux demandé au niveau 2 donne un niveau effectif au moins égal à 3 ;
- le plancher explicite 4 n'est jamais rabaissé ;
- le paquet Couple contient au moins huit cartes Audacieux dans une sélection combinée ;
- le paquet DUOS applique la même garantie ;
- le consentement 18+ reste obligatoire ;
- restart_game conserve les consentements individuels tout en réinitialisant l'état de session ;
- le replay DUOS attend les quatre votes et demande un nouveau consentement.

Les tests doivent être considérés comme réussis uniquement après exécution du workflow GitHub Actions sur cette branche. Aucun résultat de test n'est présumé dans ce rapport.

## 8. Sécurité et déploiement

- Aucun merge vers main.
- Aucun déploiement Render ou GitHub Pages.
- Aucune migration exécutée sur Supabase production.
- La migration 25 est seulement ajoutée au dépôt et testée sur la base jetable du workflow CI.
- L'application de la migration sur une base réelle doit être décidée séparément après revue de la PR et sauvegarde.

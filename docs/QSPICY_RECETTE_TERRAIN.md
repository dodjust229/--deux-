# QSPICY — recette terrain des paliers 4 à 7

## Préparation (5 min)

Ouvrir https://a-deux-jeu.onrender.com sur un téléphone et un ordinateur pour Couple ; ajouter deux appareils pour DUOS. Désigner A (hôte), B (partenaire), C et D (second duo). Utiliser des pseudos fictifs, des réponses de test et une photo non personnelle (par exemple un objet). Pour l'audio, noter le navigateur et tester Safari iOS, Chrome Android et Chrome sur ordinateur à mesure que ces appareils sont disponibles.

Vérifier les résultats dans l'ordre ci-dessous. Noter pour chaque ligne : **OK / échec / bloqué**, date et fuseau, appareils et navigateurs, résultat effectivement observé et preuve anonymisée si utile. Ne pas copier de lien d'invitation, de lien photo, de jeton ni de réponse personnelle dans le compte rendu. « OK » exige d'avoir réalisé le scénario complet sur les appareils indiqués.

| ID | Action | Résultat attendu | État |
|---|---|---|---|
| 4.1 | A crée Couple ; B ouvre l'invitation sur son appareil ; B quitte puis revient. | A est hôte, B invité ; l'hôte voit les notifications dans l'application. | À tester |
| 4.2 | A et B choisissent deux intérêts différents. B cherche à lancer, puis A lance. Refaire en Personnalisé et choisir des cartes des deux intérêts. | Un seul intérêt par joueur, choix indépendants, pas de lancement par B, lancement par A possible malgré les intérêts distincts. | À tester |
| 4.3 | A ouvre un salon DUOS ; B et C rejoignent. A essaie de lancer, puis D rejoint. Choisir des intérêts différents ; vérifier les commandes invité et lancer depuis A. | Quatre places distinctes, pas de lancement à trois, seul A peut lancer à quatre. | À tester |
| 5.1 | Couple : B refuse les photos ; A sélectionne une photo et prévisualise. B accepte, puis A confirme l'envoi ; inverser les appareils. | Rien n'est envoyé avant confirmation ni distribué sans accord ; le destinataire autorisé voit la photo. Galerie mobile et ordinateur vérifiées. | À tester |
| 5.2 | DUOS : A partage avec B ; C et D vérifient leur galerie. Tester ensuite l'espace commun en laissant un consentement manquant, puis après tous les accords requis. | Partage privé visible uniquement par A/B ; partage commun bloqué tant qu'un accord manque, puis visible par les destinataires autorisés. | À tester |
| 5.3 | B retire puis réactive la réception après avoir reçu une photo de test. | La photo disparaît de la galerie et ne revient pas après réactivation. Vérifier séparément sur environnement de test que les accès déjà accordés cessent après révocation, sans confondre galerie vide et accès révoqué. | À tester — point bloquant |
| 5.4 | A supprime une photo ; puis, sur des essais séparés, quitter un salon et terminer une partie contenant une photo de test. | Photos disparues pour les appareils concernés ; confirmer aussi la suppression du fichier côté stockage sur un environnement de test. | À tester |
| 5.5 | Sur une base jetable, vérifier le traitement d'un média expiré avec et sans déclenchement du nettoyage applicatif. | Média expiré absent de la galerie ; suppression physique au nettoyage. Si aucun navigateur ne revient, mesurer le délai réel avant de décider d'un nettoyage périodique. | À tester |
| 6.1 | Sur mobile et ordinateur : lancer Lounge, Velours puis Pluie ; modifier le volume et couper les effets. | Trois ambiances distinctes, volume fonctionnel et interrupteur des effets sans coupure involontaire de la musique ; relever les ruptures ou saturations perçues. | À tester |
| 6.2 | Couper la musique, recharger, suspendre puis ramener l'application au premier plan ; vérifier après une sortie et une fin de partie. | Pas de démarrage non sollicité, silence à la sortie et en fin de partie, reprise manuelle possible ; le jeu reste utilisable sans son. | À tester |
| 7.1 | Couple : répondre, révéler, passer, mettre en pause et reprendre. Recharger B pendant une partie, sortir puis entrer dans un second salon après une coupure Wi-Fi/données. | Retour à la bonne question ; seul le nouveau salon est affiché après changement ; aucune notification de l'ancien salon. | À tester |
| 7.2 | DUOS : tester réponses privées, duo et groupe avant/après révélation, retrait de l'accord croisé, revanche puis reconnexion. | Visibilité strictement conforme à chaque audience ; retrait appliqué, salon stable après revanche/reconnexion. | À tester |

## Points à traiter avant clôture

- **Révocation des photos.** Le code arrête de lister les photos retirées, mais délivre à la lecture des liens signés valables cinq minutes. Il ne faut pas supposer que la révocation en base invalide immédiatement un lien déjà délivré. Transformer ce point en critère bloquant : vérifier sur une cible de test, puis concevoir un accès réévalué côté serveur à chaque lecture si nécessaire. Une image déjà copiée sur un appareil ne peut pas être effacée à distance.
- **Nettoyage périodique.** Le nettoyage à l'expiration dépend actuellement d'une ouverture ou consultation. Évaluer un déclenchement planifié, indépendant du trafic, après avoir vérifié le cas 5.5. Pas de changement de production dans ce lot.
- **Après la stabilisation.** Messagerie uniquement dans Personnalisé : fil, commentaires liés à la réponse et de même visibilité, réutilisation du partage photo. Puis refonte audio (trois ambiances, effets événementiels et console). VIP1 reste distinct : Auth hôte, checkout FedaPay, état du pass, contrôle de création et expiration, puis étude vocale.

## Preuves disponibles avant recette terrain

- `main` contrôlée à `3f14afec7452950e58d6674ec4cb357b3511c54f` : seules des modifications de documentation la séparent du commit applicatif `e8617dd`.
- [CI de main](https://github.com/dodjust229/--deux-/actions/runs/45374583686) : succès sur `e8617dd`. Localement : TypeScript, 41 tests, vérifications du catalogue et build réussis.
- Render public : JavaScript servi identique octet pour octet à la compilation locale avec les paramètres publics du service (`index-CuVb0taX.js`, SHA-256 `79551b4b8fe16f530ae10d95dd200a0081651bfe61885a1698a085de0a1c282e`). Cela prouve la concordance du frontend, pas une recette sur appareils ni un nouveau contrôle du déploiement Supabase.

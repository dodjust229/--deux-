# QSPICY — vérification manuelle à deux appareils

À faire sur un projet Supabase de test, jamais sur une salle utilisée par de vrais joueurs. Les salles expirent seules après 6 h. Ouvrir A sur un téléphone et B sur un autre navigateur ou une fenêtre privée.
Ne cocher une ligne qu'après l'avoir réellement observée.

1. ☐ A crée une salle, copie le lien. B l'ouvre : le champ « identifiant de salle » est prérempli,
   B choisit son personnage et rejoint.
2. ☐ Un troisième navigateur ouvre le lien : « Cette salle est déjà complète ».
3. ☐ A coche 18+ seul : « Lancer la partie » reste bloqué. Après l'accord de B, le bouton se débloque.
4. ☐ A retire son accord : le bouton se rebloque immédiatement.
5. ☐ Choix secret : A valide ; B ne voit rien. B valide : les deux voient la révélation ensemble.
6. ☐ A clique « Question suivante » : B reste sur la révélation (« L'autre personne découvre vos
   réponses »). B clique : la partie avance une seule fois (compteur +1).
7. ☐ Question croisée : B ne peut pas répondre avant A ; B voit la réponse de A puis réagit.
8. ☐ Pause depuis A : B voit la pause et ne peut plus répondre. Reprise depuis B.
9. ☐ Un emoji natif envoyé par A apparaît chez B dans le message, sans média externe.
10. ☐ Sur une prédiction, le bouton « Passer » reste actif même si les deux champs ne sont pas remplis ; A passe, B voit le statut de passage.
11. ☐ Actualiser la page de A : retour dans la salle, même question, même état.
12. ☐ Couper le réseau de B 20 s : bandeau « Reconnexion… », retour sans perte. Recharger B avec
    le stockage de session conservé : même joueur, même place, même question. Après expiration de la
    fenêtre d'absence, un nouvel appareil ne doit pas usurper la place d'un joueur existant.
13. ☐ A passe une question : B lit « A choisi de passer, sans justification ».
14. ☐ B quitte la salle : A voit la place libre et l'état « en attente ».
15. ☐ Thème clair sur A : B reste en sombre. Réduction des animations sur A : le contenu de B
    ne change pas et celui de A reste lisible.
16. ☐ Contrôler les largeurs 320, 360, 375, 390, 430, 768, 1024, 1280 et 1440 px : aucun
    débordement horizontal, champs lisibles, boutons utilisables au doigt et contenu non masqué.
17. ☐ Fin de partie : récapitulatif, sortie propre ; DUOS ne propose pas « Rejouer » tant que
    la RPC de redémarrage DUOS n'existe pas.

## Automatisé

```bash
npm test        # 21 tests unitaires + cohérence du catalogue
npm run build   # compilation de production
```

Le scénario SQL de sécurité et de parcours reste dans `supabase/tests/scenario.sql`
(PostgreSQL ≥ 15), à exécuter sur une base de test.

18. ☐ Consentement DUOS : à la création, l'espace commun est désactivé pour chacun des quatre.
    Un seul accord ne suffit pas ; l'espace s'ouvre uniquement après les quatre accords. Le retrait
    d'un seul accord referme immédiatement l'espace commun et bloque messages/réponses de groupe.

19. ☐ SAFE est accessible dans le lobby et pendant une partie DUOS : quitter fonctionne, bloquer
    ajoute les joueurs et la salle à la liste locale puis quitte ; pause n'apparaît qu'en partie.
    Depuis le même appareil, rejoindre à nouveau une salle bloquée est refusé.

20. ☐ DUOS · pause et reprise : un joueur met la partie en pause depuis SAFE ; les quatre voient
    « Partie en pause » ; n'importe lequel clique « Reprendre la partie » et la question réapparaît
    avec les réponses déjà écrites.

21. ☐ DUOS · révocation en cours de partie : pendant une question, un joueur décoche « J'autorise
    l'espace commun » dans « Mes autorisations ». Immédiatement, l'onglet « Tous ensemble » se ferme
    chez tout le monde et les messages de groupe disparaissent. Il recoche : l'espace revient (les
    anciens messages réapparaissent, ils n'ont pas été supprimés).

22. ☐ DUOS · médias : un joueur décoche « J'accepte de recevoir des emojis et des messages ».
    Un sticker envoyé par son partenaire de duo est refusé ; un message texte passe encore.

23. ☐ DUOS · revanche : à la fin de la partie, chacun clique « Rejouer à quatre ». Le bouton affiche
    le nombre de votes (1/4 … 3/4) et reste inactif pour qui a déjà voté. Au quatrième accord, le
    salon revient à l'écran de préparation avec le même lien, réponses et messages effacés, et le
    consentement 18+ à redonner.

24. ☐ DUOS · mode deux joueurs : ouvrir un lien de salon DUOS avec le parcours à deux joueurs doit
    afficher « Ce salon est un salon DUOS » et ne jamais installer un joueur dans la salle.

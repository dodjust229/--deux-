# QSPICY — vérification manuelle à deux appareils

À faire sur le projet Supabase habituel (les salles de test expirent seules après 6 h) ou sur un
projet de test. Ouvrir A sur un téléphone et B sur un autre navigateur ou une fenêtre privée.
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
9. ☐ Sticker envoyé par A : B voit un sticker illustré et son libellé, jamais un code.
10. ☐ GIF envoyé par B : A voit le GIF animé, ou un message « GIF indisponible » si le lien est mort.
11. ☐ Actualiser la page de A : retour dans la salle, même question, même état.
12. ☐ Couper le réseau de B 20 s : bandeau « Reconnexion… », retour sans perte. Couper plus de
    2 min : A n'est pas bloqué, un nouveau joueur peut reprendre la place.
13. ☐ A passe une question : B lit « A choisi de passer, sans justification ».
14. ☐ B quitte la salle : A voit la place libre et l'état « en attente ».
15. ☐ Thème clair sur A : B reste en sombre. Réduction des animations sur A : le contenu de B
    ne change pas et celui de A reste lisible.
16. ☐ Écran de 360 px de large : aucun débordement horizontal, boutons utilisables au doigt.
17. ☐ Fin de partie : récapitulatif, « Rejouer une partie » ramène à la salle d'attente.

## Automatisé

```bash
npm test        # 21 tests unitaires + cohérence du catalogue
npm run build   # compilation de production
```

Le scénario SQL de sécurité et de parcours reste dans `supabase/tests/scenario.sql`
(PostgreSQL ≥ 15), à exécuter sur une base de test.

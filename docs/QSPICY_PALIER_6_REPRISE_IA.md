# QSPICY — dossier de reprise IA · Palier 6

Date : 24 novembre 2026  
Branche : `qspicy/palier-6-musique-ambiance`  
Objet : musique d'ambiance, sons d'interface et ambiance visuelle.

## Décision d'implémentation

Le palier ajoute des nappes audio originales, synthétisées localement avec Web Audio. Aucun morceau commercial, fichier audio externe, service de streaming ou dépendance supplémentaire n'est utilisé.

### Ambiances disponibles
- **Lounge chaleureux** : accords synthétiques doux et discrets.
- **Velours** : nappes graves et plus profondes.
- **Pluie** : bruit filtré doux avec un bourdon léger.
- **Désactivée** : silence.

Les effets courts de l'interface (envoi, révélation, etc.) restent indépendants de la musique et gardent leur interrupteur existant.

## Comportement et confidentialité
- Tout est généré sur l'appareil du joueur ; aucune donnée audio n'est envoyée à Supabase.
- Le joueur choisit explicitement l'ambiance puis appuie sur « Lancer l'ambiance ». Pas de lecture automatique au chargement, afin de respecter les règles d'autoplay des navigateurs.
- Le volume est réglable ; la musique reste très discrète par défaut.
- Le choix est local à l'appareil et persiste dans les préférences existantes.
- L'ambiance s'arrête automatiquement quand le joueur quitte sa salle ou quand la partie est terminée.
- Les animations visuelles existantes des salons restent liées au niveau du jeu et au réglage « réduire les animations ».
- Aucun son ne doit être joué pendant une session si le joueur ne l'a pas explicitement activé.

## Fichiers
- `src/lib/sound.ts` : effets sonores et moteur Web Audio des ambiances.
- `src/lib/prefs.ts` : préférence locale `ambience` et validation des valeurs.
- `src/components/Settings.tsx` : choix de l'ambiance, activation manuelle et contrôle du volume.
- `src/styles/ambience.css` : présentation du sélecteur.
- `src/App.tsx` : arrêt audio à la sortie et à la fin de la partie.
- `src/lib/prefs.test.ts` : tests de compatibilité et persistance des préférences.

## Tests et limites de validation
Les tests automatisés doivent confirmer le typecheck, le build, la suite unitaire et la cohérence du catalogue. Une recette réelle reste nécessaire sur téléphone et ordinateur :
1. Activer chacune des trois ambiances depuis Réglages.
2. Vérifier que le volume agit sur la musique et les sons d'interface.
3. Couper l'ambiance, changer de salon, quitter et terminer une partie : aucun son ne doit continuer.
4. Recharger la page : aucune lecture automatique ne doit démarrer ; l'utilisateur doit cliquer pour relancer.
5. Tester Safari iOS, Chrome Android et Chrome desktop, notamment la reprise après suspension audio.

Le navigateur peut suspendre Web Audio en arrière-plan ou en mode économie d'énergie ; le jeu doit continuer normalement sans son. L'audio est une ambiance atmosphérique synthétique, pas une bande-son orchestrale ni une piste musicale enregistrée.

## Statut
Ne pas déclarer le palier terminé avant CI réussie, fusion, déploiement Render en statut live et recette audio sur de vrais appareils.
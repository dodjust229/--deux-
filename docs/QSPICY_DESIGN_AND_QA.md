# QSPICY — Spécification de design et de vérification

Ce document complète le dossier de reprise. Il transforme les retours du propriétaire en critères observables.

## A. Principes d'expérience

1. La première impression doit installer une ambiance, pas expliquer longuement le produit.
2. QSPICY est un jeu conversationnel à deux, pas une messagerie WhatsApp recolorée.
3. La sensualité est suggérée par l'atmosphère, le rythme, les mots et les interactions ; pas par des images explicites.
4. Les personnages sont illustrés et expressifs, jamais des photos de personnes réelles.
5. Le contenu est réservé aux adultes (18+) et chaque participant conserve le droit de passer.
6. L'interface doit être mobile-first, lisible et performante.

## B. Architecture de l'accueil

Éléments à évaluer dans l'audit :
- Logo QSPICY réellement fourni par le propriétaire.
- Traitement du Y-piment.
- Visuel de fond ou composition animée.
- Accroche courte et émotionnelle.
- Boutons « Créer une partie » et « Rejoindre une partie » clairement visibles.
- États de chargement, erreurs, code de salon et retour utilisateur.
- Absence de tutoriel envahissant.

Proposition de contenu de marque à tester, non définitive :
- « Certaines conversations méritent de sortir de l'ordinaire. »
- « Deux personnes. Une autre façon de se parler. »
Ne pas figer ces textes sans validation.

## C. Conversation mise en scène — storyboard

### État 1 : écoute
Les deux personnages sont visibles dans des zones dédiées. Le personnage inactif adopte une posture d'écoute subtile.

### État 2 : prise de parole
Le personnage actif effectue un geste d'anticipation puis une animation de parole. Sa bulle apparaît dans une zone qui ne recouvre ni son visage ni l'autre personnage.

### État 3 : lecture
Le texte apparaît dans la bulle avec une animation courte. La bulle reste fixe et lisible pendant toute la durée nécessaire.

### État 4 : réponse
L'autre personnage réagit (regard, sourire, surprise, réflexion) puis devient actif.

### État 5 : transition
La bulle précédente reste lisible ou se réduit proprement. Le changement de tour ne doit pas provoquer de saut de layout.

Les animations doivent être déclenchées par l'état réel de la partie et non par des minuteries indépendantes qui peuvent diverger entre clients.

## D. Grille de vérification visuelle

Pour chaque écran, contrôler :
- Hiérarchie visuelle évidente.
- Contraste suffisant.
- Textes jamais masqués.
- Aucun chevauchement avatar/bulle/contrôles.
- Espacement adapté aux petits écrans.
- Cibles tactiles suffisamment grandes.
- États chargement/vide/erreur.
- Cohérence du thème clair et sombre.
- Aucune animation bloquante.
- Réduction de mouvement sans perte de fonctionnalité.

## E. Matrice de tests fonctionnels

| Domaine | Scénario | Résultat attendu |
|---|---|---|
| Salon | Joueur A crée, joueur B rejoint | Les deux accèdent au même salon |
| Synchronisation | A répond | B voit l'état actualisé |
| Tour | A seul tente de faire avancer si les deux validations sont requises | Règle existante respectée |
| Reconnexion | Un joueur recharge la page | Session récupérée ou erreur claire |
| Messages | Envoi texte | Texte rendu une seule fois |
| Sticker | Envoi d'un sticker | Image visible, pas de commande brute |
| GIF | Envoi d'un GIF | Animation rendue correctement |
| Erreur média | Asset indisponible | Fallback visuel et message clair |
| Thème | A choisit sombre, B clair | Préférences indépendantes |
| Réduction mouvement | Activée | Mouvements non essentiels réduits, interface intacte |
| Motion | Question déclenchée | Geste, bulle et texte synchronisés |
| Responsive | Petit écran portrait | Aucun chevauchement ni débordement |
| Audio | Sons coupés | Aucun son ne joue |
| Build | Build production | Commande de build réussie |

## F. Critères de performance

- Éviter les vidéos lourdes en arrière-plan.
- Préférer les animations vectorielles ou CSS lorsque cela donne un résultat équivalent.
- Charger les ressources non essentielles à la demande.
- Prévoir des images de secours et des dimensions explicites pour éviter les sauts de layout.
- Respecter les appareils modestes et les connexions lentes.
- Ne pas dépendre d'un CDN externe pour les assets essentiels.

## G. Livraison de design attendue

Avant le développement complet, fournir :
1. Palette avec valeurs HEX.
2. Typographies et licences/conditions d'utilisation.
3. Logo et variantes nécessaires.
4. Deux personnages cohérents avec plan d'expressions.
5. Maquette accueil mobile.
6. Maquette salon avant démarrage.
7. Maquette conversation en cours.
8. Maquette paramètres.
9. Storyboard de 5 à 8 états d'animation.
10. Inventaire des assets et formats.
11. Explication des choix d'accessibilité et de performance.

## H. Ce qui constitue un échec

- Simple changement de couleurs et de logo.
- Deux avatars statiques au-dessus d'une conversation classique.
- Personnages qui masquent les textes.
- Animations décoratives sans lien avec les événements du jeu.
- Réduction des animations nécessaire pour corriger un bug.
- Stickers représentés comme du texte/commande.
- Catalogue composé de questions génériques ou répétitives.
- Ajout d'une API payante ou d'un abonnement indispensable.
- Réécriture qui casse le jeu à deux.
- Déploiement sans validation.

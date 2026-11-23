# QSPICY — Dossier de reprise pour Claude

> Document de cadrage préparatoire. Il ne remplace pas l'audit du code et n'autorise ni la mise en production ni une réécriture immédiate.

## 1. Mission

Faire évoluer le jeu existant « À deux » vers **QSPICY**, une expérience interactive à deux adultes (18+) fondée sur la complicité, l'humour, les confidences, l'intimité suggérée et l'audace. Il s'agit d'une refonte de l'expérience, pas d'un simple changement de couleurs ni d'une messagerie décorée.

Le propriétaire souhaite que Claude prenne en charge l'audit approfondi, la vérification des fonctionnalités, la conception visuelle et la réalisation après présentation d'un plan clair.

## 2. État connu — à revalider dans le dépôt

- Dépôt : https://github.com/dodjust229/--deux-
- Branche de production connue : `main`
- Hébergement connu : Render, site `a-deux-jeu`, URL https://a-deux-jeu.onrender.com
- Backend connu : Supabase, projet nommé « A deux »
- Le dépôt contient actuellement une archive source `a-deux-source.tar.gz`. La première étape est de l'extraire et d'inspecter son contenu avant de conclure quoi que ce soit sur la stack ou le code.
- L'application a déjà été utilisée en situation réelle par deux joueurs. Le multijoueur existant est donc une capacité essentielle à préserver, mais il faut refaire des tests après chaque changement significatif.
- Des migrations Supabase et un catalogue de 43 entrées avaient été préparés antérieurement. Vérifier leur état réel dans le code et dans le projet Supabase avant de s'y fier.
- Le déploiement Render est automatisé depuis GitHub. Ne pas pousser de changement sur `main` sans autorisation.

## 3. Défauts et besoins rapportés par le propriétaire

### Accueil et identité
- L'identité « A2 » avec cœur et l'apparence actuelle ne plaisent pas.
- Le nom final est **QSPICY** (Q et S en majuscules). Le dernier Y doit être traité graphiquement comme un piment rouge vif.
- Le propriétaire indique avoir déjà fourni un logo : rechercher l'asset original dans les pièces jointes, les ressources du projet et les fichiers disponibles avant de le redessiner.
- L'accueil actuel paraît générique, trop proche d'un jeu romantique classique. Il doit être repensé entièrement.

### Ton émotionnel et visuel
- Pas de nudité, pas d'images vulgaires, pas de sexualisation visuelle.
- L'expérience doit transmettre chaleur, tension émotionnelle, mystère, complicité et sensualité suggérée.
- Direction créative attendue : moderne, élégante, distinctive, premium, vivante. Ne pas appliquer simplement du rouge partout ni multiplier les flammes/piments comme décoration.

### Personnages et conversation animée
- Le propriétaire ne veut pas de photographies d'humains réels ni de personnages photoréalistes.
- Il souhaite deux personnages illustrés originaux, stylisés, expressifs, qui représentent les deux joueurs.
- La conversation doit être mise en scène : le personnage actif fait un geste, sa bulle apparaît au-dessus de lui et le texte/question s'affiche dans cette bulle ; l'autre personnage écoute/réagit puis prend son tour.
- Les personnages ne doivent jamais recouvrir le texte, les bulles ou les contrôles.
- Problème constaté : animations mal synchronisées, avatar placé devant le texte et chevauchement. Le joueur a dû activer « réduire les animations » pour figer le mouvement. C'est un défaut : le mode normal doit être propre, et le mode réduit doit rester lisible.
- Les gestes doivent avoir une intention (écoute, réflexion, sourire, surprise, prise de parole), pas bouger en permanence.

### Messagerie, stickers et GIF
- Les stickers envoyés ne sont pas rendus correctement : ils apparaissent comme une commande/texte ou comme un GIF mal interprété.
- Vérifier le modèle de données, le transport, le stockage, le composant de rendu et les formats MIME.
- Distinguer clairement message texte, sticker statique, GIF animé et réaction.
- Ajouter aperçu avant envoi et gestion des erreurs de chargement.

### Réglages
- Thème clair/sombre choisi indépendamment par chaque joueur/appareil.
- Réduction des animations fonctionnelle.
- Sons et volume réglables, avec désactivation totale.
- Préférences locales par joueur ; ne pas synchroniser le thème d'un joueur vers l'autre.

## 4. Vision produit

QSPICY doit se sentir comme un espace privé et chaleureux où deux personnes qui se connaissent déjà entrent pour avoir une conversation différente de WhatsApp. L'application ne doit pas donner l'impression d'un clone de messagerie.

Le parcours doit être immédiat :
1. Arrivée immersive et claire.
2. Création ou rejoindre une partie.
3. Mise en présence des deux personnages.
4. Choix du mode/intensité si prévu.
5. Échange animé et interactif.
6. Réactions, défis et surprises.
7. Fin de partie et possibilité de recommencer.

Pas de long guide à l'accueil. L'interface doit être compréhensible par découverte.

## 5. Direction artistique proposée (à prototyper, pas à appliquer aveuglément)

Concept de travail : **Warm Cinematic Play**.

- Palette candidate : charbon/encre, bordeaux profond, rouge piment, cuivre, ambre chaud et ivoire.
- Lumière : halos doux, reflets subtils, profondeur, gradients maîtrisés, petites particules rares.
- Typographie : combinaison d'une police d'affichage expressive et d'une sans-serif très lisible.
- Composition : espaces respirants, hiérarchie claire, bulles intégrées à la scène, personnages comme acteurs du dialogue.
- Ambiance : premium, complice, émotionnelle, pas « dating app », pas esthétique enfantine.
- Thème clair : ivoire/crème, charbon, accents rouge piment/cuivre. Thème sombre : charbon/bordeaux, accents ambre/rouge.
- Logo : conserver l'orthographe QSPICY et le Y-piment comme signature, sans déformer la lisibilité du mot.

Claude doit présenter 2 pistes visuelles cohérentes et une maquette de l'écran d'accueil + écran de conversation avant d'implémenter le design complet.

## 6. Personnages — exigences de production

Créer deux personnages illustrés originaux et cohérents, non photoréalistes. Leur style peut être 2D premium, 2.5D ou 3D stylisée, à condition d'être expressif et performant sur mobile.

Prévoir une bibliothèque d'états :
- idle / repos ;
- speaking / prise de parole ;
- listening / écoute ;
- thinking / réflexion ;
- amused / amusement ;
- surprised / surprise ;
- shy / gêne légère ;
- reacting / réaction ;
- celebrating / réussite.

Les poses/expressions doivent être compatibles avec un système d'animation réaliste. Une seule image fixe ne suffit pas à simuler un personnage vivant. Évaluer sprites, SVG articulé, CSS transform, Lottie/Rive seulement si les outils et coûts restent gratuits et les ressources intégrables localement. Ne pas ajouter de service externe payant.

## 7. Motion design et accessibilité

- Définir une machine à états pour les animations et dialogues : idle → anticipation → gesture/speaking → bubble reveal → hold/read → response/reaction → next turn.
- Les animations doivent être déclenchées par les événements du jeu, pas par des timers indépendants susceptibles de se désynchroniser.
- Réserver une zone de mise en page aux personnages et une zone distincte aux bulles ; ne pas compter sur des superpositions absolues fragiles.
- Utiliser des transitions courtes et cohérentes ; respecter les performances des téléphones modestes.
- `prefers-reduced-motion` et réglage interne doivent réduire les mouvements non essentiels sans figer ou casser la scène.
- Le texte doit rester lisible pendant toute l'animation. Aucun élément interactif ne doit être masqué ou déplacé sous un personnage.
- Prévoir tests sur petits écrans et orientation portrait.

## 8. Contenu et gameplay

Public : adultes exclusivement, 18+. Niveau d'audace choisi : 5/5. Expérience : mixte (humour, complicité, intimité, désir, confidences et audace).

Catégories de contenu à prévoir :
1. Attirance et séduction.
2. Désir et curiosité.
3. Confessions.
4. Intimité et préférences.
5. Audace et provocation.
6. Couple et relations.
7. Vérités sans détour.
8. Humour et situations embarrassantes.
9. Scénarios imaginaires et dilemmes.
10. Défis réalisables à distance.
11. Souvenirs et expériences.
12. Surprises.

Niveaux : 1 léger, 2 personnel, 3 intime, 4 audacieux, 5 très audacieux. Le niveau 5 doit être réellement plus direct et spécifique, sans devenir vulgaire ou répétitif.

Modes envisagés :
- Face-à-face : les deux répondent.
- Qui connaît l'autre ? : deviner la réponse du partenaire.
- Sans détour : questions directes.
- Défi pimenté : défis.
- Surprise : déclencheurs inattendus.

Mécaniques possibles : passer une question sans sanction, question de relance, choix entre deux scénarios, réaction, devinette, défi optionnel, surprise. Le consentement doit être explicite et chaque joueur doit pouvoir passer ou quitter sans humiliation.

Ne pas remplir le catalogue avec des questions génériques du type « quelle est ta plus grande peur ? » répétées sous différentes formes. Le propriétaire veut des formulations adultes, concrètes, franches, surprenantes et naturelles. Construire un catalogue structuré et dédupliqué, pas une liste de prompts vagues.

Format recommandé JSON : id stable, catégorie, intensité, type, texte, relance éventuelle, mode compatible, tags et éventuelle limite de contenu.

## 9. Contraintes techniques

- Conserver Supabase et Render si l'audit confirme que l'architecture actuelle reste adaptée.
- Aucun abonnement, aucune API payante, aucun service externe indispensable.
- Assets visuels, audio, stickers et animations livrés localement dans le projet.
- Ne pas introduire de dépendance lourde sans justification.
- Ne jamais exposer une clé Supabase service_role dans le frontend, dans un prompt ou dans le dépôt.
- Conserver les politiques RLS, la validation des tokens et les contrôles d'accès. Ne pas affaiblir la sécurité pour simplifier le développement.
- Le thème et les préférences d'affichage sont propres à chaque appareil/joueur.
- Ne pas changer le schéma de base de données sans migration documentée et vérifiée.

## 10. Procédure obligatoire de reprise

### Étape A — Audit sans modification
1. Extraire `a-deux-source.tar.gz`.
2. Lister l'arborescence complète et identifier le vrai point d'entrée.
3. Lire package manifests, scripts, composants, styles, assets, migrations, configuration et tests.
4. Comprendre le flux exact de création/rejoindre salon, authentification/token, synchronisation, tours, réponses et suppression.
5. Identifier les composants d'accueil, de conversation, d'avatar, de bulles, de stickers/GIF et de paramètres.
6. Vérifier les options existantes et leur état réel.
7. Vérifier les scripts de build/test et les contraintes Render.
8. Ne pas déduire le comportement uniquement depuis le visuel : suivre les données et événements.

Livrable : rapport d'audit avec chemins de fichiers, preuves observées, gravité, risques et corrections proposées.

### Étape B — Conception
Présenter :
- deux directions artistiques décrites ;
- une recommandation argumentée ;
- maquette accueil ;
- maquette conversation animée ;
- concept et style des deux personnages ;
- storyboard d'une séquence de dialogue ;
- palette, typographies, composants et règles responsive ;
- plan d'animation et états de personnages.

Attendre validation du propriétaire avant la refonte complète.

### Étape C — Réalisation isolée
- Travailler exclusivement sur une branche de développement.
- Ne pas modifier `main`.
- Ne pas lancer de déploiement Render.
- Conserver un état fonctionnel de référence.
- Découper en petits changements vérifiables.
- Documenter chaque migration et chaque nouvelle dépendance.

### Étape D — Tests et revue
Tester au minimum :
- deux navigateurs/appareils connectés au même salon ;
- création et jonction ;
- progression des tours et réponses ;
- déconnexion/reconnexion ;
- messages texte ;
- stickers statiques et GIF animés ;
- thème indépendant sur chaque appareil ;
- mode réduction des animations ;
- synchronisation personnage/bulle/texte ;
- petits écrans Android ;
- build de production ;
- règles RLS et accès aux salons.

Rapporter les tests réussis, échoués et non effectués. Ne jamais annoncer « tout fonctionne » si un test n'a pas été exécuté.

### Étape E — Livraison
Fournir le code, les assets locaux, les fichiers JSON du catalogue, les migrations, les instructions de configuration, les tests et le rapport final. La fusion et le déploiement nécessitent l'accord explicite du propriétaire.

## 11. Première réponse attendue de Claude

Ne commence pas à coder. Réponds d'abord avec :
1. L'arborescence réelle après extraction.
2. La stack et les scripts détectés.
3. Les fonctionnalités existantes vérifiées.
4. Les défauts confirmés ou à reproduire.
5. Les fichiers précis concernés par chaque chantier.
6. Les risques de régression.
7. Les éléments à conserver absolument.
8. Un plan de travail priorisé.
9. Les éléments nécessitant une décision du propriétaire.

**Priorité absolue : comprendre l'existant, préserver le multijoueur, puis concevoir une expérience QSPICY cohérente et réellement animée.**

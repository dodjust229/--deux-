# QSPICY — Cahier des charges d'exécution pour Genspark AI

> **Mission :** reprendre le projet existant « À deux » et le transformer en une application de jeu relationnel adulte appelée **QSPICY**, fonctionnelle, cohérente, responsive et prête à être testée avant mise en production.
>
> **Langue de travail et de l'interface :** français.
> **Public :** adultes de 18 ans et plus.
> **Branche de travail autorisée :** `genspark/qspicy-refonte`.
> **Branche de production à protéger :** `main`.

---

## 1. Consignes prioritaires à l'agent

Tu es chargé de mener le travail technique jusqu'à un résultat exploitable. Ne te limite pas à produire des recommandations ou une maquette : tu dois examiner le code existant, comprendre l'architecture, implémenter les améliorations, lancer les tests disponibles et livrer un compte rendu précis.

### Règles non négociables

1. Commence par lire intégralement :
   - `docs/QSPICY_CLAUDE_HANDOFF.md`
   - `docs/QSPICY_DESIGN_AND_QA.md`
   - le présent document.
2. Examine réellement le dépôt et **extrais l'archive `a-deux-source.tar.gz`** si elle contient toujours le code de l'application. Ne suppose pas que les informations historiques décrivent encore exactement le projet.
3. Fais un inventaire rapide de l'architecture, des pages, des composants, des fonctionnalités, des dépendances, des scripts et de la configuration.
4. Ensuite, réalise la refonte et les corrections décrites ci-dessous. Tu peux organiser le travail en sous-tâches ou mobiliser plusieurs agents, mais un seul agent doit coordonner les changements et vérifier leur cohérence.
5. Travaille exclusivement sur `genspark/qspicy-refonte`. Ne pousse jamais directement sur `main`, ne supprime pas la branche de préparation et ne réécris pas l'historique Git.
6. **Ne déploie rien** sur Render, Netlify ou un autre hébergeur. Le propriétaire du projet fera valider le résultat avant la mise en ligne.
7. Ne lance aucune migration destructive et ne modifie pas la base Supabase de production sans nécessité démontrée. Ne supprime aucune table, donnée, fonction RPC ou politique RLS existante.
8. Ne demande jamais, n'affiche jamais et ne committe jamais de clé secrète, mot de passe, `service_role`, token privé ou fichier `.env`. Les secrets doivent rester dans les variables d'environnement.
9. N'invente pas de fonctionnalités terminées : si un élément ne peut pas être implémenté ou testé, indique-le explicitement.
10. Ne remplace pas une fonctionnalité existante par une simple maquette ou un faux bouton. Chaque contrôle visible doit avoir un comportement réel, ou être clairement désactivé/masqué.

### Objectif de livraison

À la fin, le dépôt doit contenir une version QSPICY qui :
- démarre et se compile sans erreur ;
- conserve le fonctionnement réel du jeu multijoueur ;
- possède une interface refondue et cohérente ;
- présente une vraie expérience de dialogue animé entre deux personnages ;
- fonctionne sur mobile et ordinateur ;
- respecte les préférences de réduction des animations ;
- gère correctement les messages, réactions, stickers et GIF ;
- ne nécessite aucun service payant obligatoire ;
- est accompagnée d'instructions de lancement, d'un rapport de tests et d'une liste claire des limites restantes.

---

## 2. Vision produit et identité

**Nom définitif : QSPICY** (respecter exactement cette orthographe et cette casse).

QSPICY est un jeu relationnel interactif pour deux personnes, destiné aux adultes. Il doit favoriser la complicité, le rire, les confidences, la tension émotionnelle, la séduction et les échanges audacieux, sans devenir vulgaire.

Le produit ne doit pas ressembler à une messagerie WhatsApp générique. L'expérience principale est un **dialogue scénarisé et vivant entre deux personnages**, dans lequel les questions, réponses et réactions deviennent le cœur de l'écran.

### Logo et marque

- Cherche d'abord dans les fichiers du dépôt et dans les ressources existantes le logo QSPICY déjà fourni par le propriétaire.
- Si le logo existe, réutilise-le fidèlement et vérifie qu'il est lisible sur fond clair et foncé.
- Le caractère final **Y** doit être représenté par ou transformé en un long piment rouge vif, selon le logo fourni.
- Supprime l'ancien logo « A2 » avec cœur de l'interface finale.
- Ne crée pas un logo générique si le logo existant est présent.
- Ne parsème pas l'interface de piments, flammes ou pictogrammes décoratifs répétitifs.

### Direction artistique

Créer une identité :
- chaleureuse, élégante, premium et reconnaissable ;
- moderne, expressive et cinématographique, sans surcharge ;
- sensuelle par l'atmosphère, les expressions et les interactions, jamais par des images explicites ;
- adaptée à un usage prolongé sur smartphone.

Palette indicative à adapter avec goût :
- encre / charbon ;
- bordeaux profond ;
- rouge piment en accent ;
- cuivre ou ambre ;
- ivoire / crème.

Éviter les clichés d'applications de rencontre (rose/violet omniprésent), le rouge partout, les flammes et les dégradés excessifs.

---

## 3. Personnages et animation — élément central de la refonte

Le jeu doit mettre en scène **deux personnages illustrés originaux**, complémentaires, expressifs et visuellement cohérents. Pas de photographies de personnes réelles et pas de personnages humains photoréalistes.

Les personnages doivent avoir une vraie personnalité visuelle : silhouettes, visages, vêtements, expressions et gestuelle lisibles. Prévoir au minimum un personnage à présentation masculine et un second personnage complémentaire. Ils représentent les deux joueurs, sans imposer une identité réelle aux participants.

### États à prévoir

Chaque personnage doit pouvoir adopter des états visuels distincts :
- repos / attente ;
- écoute ;
- prise de parole ;
- réflexion ;
- sourire / amusement ;
- surprise ;
- gêne / timidité ;
- réaction ;
- célébration.

### Déroulement d'un échange

Le comportement attendu est le suivant :

1. Le personnage dont c'est le tour devient visuellement actif.
2. Il effectue un mouvement discret et naturel (tête, main, regard, posture).
3. Une bulle apparaît près de lui, dans une zone prévue à cet effet.
4. La question ou le message s'affiche dans cette bulle.
5. L'autre personnage adopte une posture d'écoute ou une réaction adaptée.
6. Après la réponse, les rôles alternent selon la logique réelle du jeu.
7. Les animations suivent les événements et l'état réel de la partie, pas des minuteries indépendantes qui se désynchronisent.

### Défauts à éliminer

- aucun avatar ne doit recouvrir un texte, une bulle, un bouton ou une zone interactive ;
- aucun élément ne doit sortir de l'écran sur mobile ;
- les animations ne doivent pas se chevaucher ou se déclencher dans le mauvais ordre ;
- le texte doit rester lisible pendant toute la transition ;
- les deux personnages ne doivent pas parler simultanément par erreur ;
- les animations ne doivent jamais bloquer la progression du jeu.

Privilégier des animations CSS/SVG/JS légères et maîtrisées. Si des animations complexes sont utilisées, elles doivent rester performantes sur les téléphones Android courants.

### Réduction des animations

Le réglage « Réduire les animations » doit être respecté correctement :
- conserver les personnages, les bulles, les textes et la mise en page ;
- supprimer ou raccourcir les mouvements non essentiels ;
- ne jamais figer l'application dans un état incomplet ;
- ne jamais masquer une information nécessaire ;
- prendre aussi en compte `prefers-reduced-motion` du système lorsque c'est pertinent.

---

## 4. Écrans et parcours utilisateur

### Écran d'accueil

Refondre complètement l'accueil. Il doit être immédiatement compréhensible, visuellement fort et sans long tutoriel.

Afficher clairement :
- le logo QSPICY ;
- une courte phrase qui explique l'expérience ;
- le bouton « Créer une partie » ;
- le bouton « Rejoindre une partie » ;
- une indication claire « Réservé aux 18 ans et plus ».

Les actions doivent être réelles et reliées au système existant de création/rejoindre une salle.

### Création et accès à une partie

- Permettre de créer une salle et d'obtenir un code ou lien de partage selon les mécanismes existants.
- Permettre à un second joueur de rejoindre la salle.
- Gérer les erreurs : code invalide, salle inexistante, salle pleine, connexion perdue, salle expirée.
- Afficher un état d'attente compréhensible lorsque le second joueur n'a pas encore rejoint.
- Ne pas exposer les tokens de session dans l'interface ou les journaux.

### Partie en cours

L'écran de jeu doit prioriser :
1. les deux personnages ;
2. la bulle de dialogue et le contenu courant ;
3. la réponse ou l'action attendue ;
4. les actions utiles : répondre, passer, relancer, réagir, quitter ;
5. l'indication du tour et de la progression.

L'interface doit rester claire sur les petits écrans. Ne pas réduire excessivement la taille du texte pour faire tenir trop d'éléments.

### Fin de partie

Prévoir une fin claire et positive, avec possibilité de recommencer ou de quitter. Ne jamais humilier un joueur, afficher un classement dévalorisant ou pénaliser quelqu'un qui souhaite arrêter.

---

## 5. Modes de jeu et contenu

Les modes ci-dessous sont des pistes produit à examiner à partir de ce que le code et le catalogue existants permettent réellement. Ne casse pas les modes déjà opérationnels. Si un mode n'existe pas encore, ne prétends pas qu'il est disponible sans l'avoir développé et testé.

Modes envisagés :
- **Face-à-face** : questions et réponses alternées.
- **Qui connaît l'autre ?** : deviner la réponse de son partenaire.
- **Sans détour** : questions franches et confidences.
- **Défi pimenté** : défis audacieux mais facultatifs.
- **Surprise** : séquences inattendues et interactions spéciales.

### Ton et niveau d'audace

Le contenu est destiné à des adultes de 18 ans et plus. L'audace visée est élevée (niveau 5/5), tout en restant intelligente, naturelle et respectueuse.

Les thèmes peuvent couvrir :
- humour et complicité ;
- souvenirs et confidences ;
- attirance et désir ;
- intimité et préférences ;
- scénarios imaginaires ;
- questions franches ;
- défis relationnels facultatifs.

Éviter les questions banales, scolaires ou trop abstraites. Les formulations doivent sonner comme une vraie conversation entre adultes, pas comme un questionnaire administratif.

### Consentement et liberté

- Chaque joueur peut passer une question ou un défi sans justification.
- Chaque joueur peut quitter la partie à tout moment.
- Aucun gage humiliant, aucune sanction, aucune pression.
- Les défis doivent rester facultatifs.
- Ne jamais imposer de contact physique, d'acte sexuel, de partage d'image intime ou de révélation personnelle.
- Prévoir des formulations claires qui permettent de dire non ou de changer de sujet.

### Catalogue

- Auditer le catalogue actuel avant toute modification.
- Préserver les données existantes utiles et leur structure.
- Vérifier la qualité, la diversité et la cohérence des catégories.
- Éviter les doublons et les questions presque identiques.
- Ne pas remplir artificiellement le catalogue avec des questions génériques.
- Si tu ajoutes du contenu, le faire dans un format compatible avec le schéma réel, et documenter précisément le nombre d'éléments ajoutés.
- Ne jamais prétendre que le catalogue est complet si ce n'est pas le cas.

---

## 6. Messagerie, réponses, réactions, stickers et GIF

Le propriétaire a signalé que certains stickers semblent être affichés comme du texte ou interprétés comme des GIF. Il faut examiner le problème de bout en bout.

Auditer :
- le modèle de données des messages ;
- le format utilisé pour transporter les messages ;
- la sauvegarde et la récupération ;
- le rendu visuel ;
- les types MIME et les URL des médias ;
- les réactions et les stickers ;
- le traitement des GIF animés.

Distinguer explicitement les types de contenu :
- texte ;
- réaction ;
- sticker statique ;
- GIF animé ;
- événement système / événement de jeu.

Attendus :
- un sticker ne doit jamais apparaître comme une commande brute ou un code ;
- un GIF ne doit pas être affiché comme un sticker incorrect ;
- prévoir un aperçu, un rendu adapté et un fallback en cas de média indisponible ;
- gérer les erreurs de chargement ;
- vérifier le comportement sur mobile ;
- ne pas ajouter une dépendance à une API payante.

Si la fonctionnalité actuelle est trop fragile, proposer une correction compatible avec l'architecture existante plutôt que réécrire toute la messagerie sans raison.

---

## 7. Préférences et accessibilité

Les préférences suivantes doivent être indépendantes pour chaque joueur et, autant que possible, stockées localement sur son appareil :
- thème clair / sombre ;
- réduction des animations ;
- sons activés / désactivés ;
- volume sonore.

**Important :** le thème choisi par un joueur ne doit pas imposer le thème à l'autre joueur. Ces préférences relèvent de l'appareil et de l'expérience personnelle, pas de l'état partagé de la partie.

Prévoir :
- des libellés explicites ;
- des contrôles accessibles au clavier ;
- des contrastes suffisants ;
- des tailles de zones tactiles adaptées ;
- une gestion correcte du focus ;
- des états de chargement et d'erreur compréhensibles.

Les sons sont optionnels. Préférer des sons locaux légers si tu en ajoutes. Aucun son ne doit être obligatoire ou se déclencher de façon agressive. Pas de voix off pour cette version.

---

## 8. Architecture et intégrité technique

### Avant toute modification

Identifier :
- framework et version ;
- point d'entrée de l'application ;
- organisation des pages et composants ;
- gestion de l'état ;
- gestion des tours et réponses ;
- système de salle et de code de partage ;
- appels Supabase ;
- fonctions RPC ;
- politiques RLS ;
- scripts de build et de test ;
- variables d'environnement requises ;
- éventuels fichiers générés et ressources graphiques.

### Supabase et multijoueur

L'application utilise historiquement Supabase. Les éléments connus à revalider dans le code et le projet :
- projet Supabase : `xqvxorvvjmwzpcqmqnqv` ;
- tables précédemment identifiées : `catalog`, `rooms`, `players`, `answers`, `rate_events` ;
- fonctions RPC avec validation de tokens ;
- synchronisation historiquement basée sur du polling.

Ces informations sont indicatives et doivent être vérifiées. Ne les considère pas comme une garantie de l'état actuel.

Exigences :
- préserver le flux de création et de jonction d'une partie ;
- préserver la synchronisation des deux joueurs ;
- empêcher qu'un seul joueur valide une étape qui exige les deux validations ;
- gérer les déconnexions, retours en ligne et états obsolètes ;
- éviter les doubles soumissions et les transitions concurrentes ;
- vérifier les droits d'accès et la validation côté serveur ;
- ne pas faire confiance au seul client pour les règles importantes ;
- ne jamais placer de clé `service_role` dans le navigateur.

Ne modifie pas le schéma Supabase par confort. Toute migration nécessaire doit être versionnée, documentée, réversible autant que possible et séparée du déploiement. Si une action nécessite un accès que tu n'as pas, prépare le fichier SQL et explique exactement ce qui doit être appliqué ; ne prétends pas l'avoir exécuté.

### Sécurité

- Valider les entrées côté serveur et côté client.
- Éviter l'exposition des tokens de salle.
- Contrôler les accès aux salles et aux réponses.
- Vérifier les politiques RLS et les fonctions SECURITY DEFINER existantes.
- Ne pas journaliser de secrets.
- Documenter tout risque résiduel découvert.

### Dépendances et coûts

Le propriétaire veut garder le projet gratuit à l'usage autant que possible :
- pas d'API payante obligatoire ;
- pas de nouvel abonnement nécessaire pour jouer ;
- privilégier les ressources locales et les bibliothèques open source ;
- éviter les dépendances lourdes ou inutiles ;
- signaler les éventuelles limites des offres gratuites existantes, sans les masquer.

---

## 9. Compatibilité, performance et qualité

Priorité mobile-first, notamment Android, puis adaptation ordinateur.

Tester au minimum :
- écran étroit (environ 360 px de largeur) ;
- écran mobile courant ;
- tablette ;
- ordinateur ;
- orientation portrait et paysage lorsque pertinente ;
- connexion lente ou instable ;
- rechargement de page ;
- deux joueurs sur deux appareils distincts.

Vérifier :
- absence de débordement horizontal ;
- aucun texte coupé ou masqué ;
- bulles et personnages jamais superposés de façon illisible ;
- boutons utilisables au toucher ;
- animations fluides et non bloquantes ;
- pas d'erreurs console critiques ;
- pas d'échec de build ;
- pas de fuite de mémoire évidente ;
- chargement raisonnable des ressources.

Respecter les bonnes pratiques de performance : images optimisées, ressources limitées, animations transform/opacity lorsque possible, nettoyage des abonnements et timers, composants raisonnablement découpés.

---

## 10. Plan d'exécution demandé

Procède dans cet ordre, sans attendre une nouvelle consigne pour les tâches ordinaires :

### Phase A — Comprendre
- lire les trois documents de spécification ;
- extraire et inspecter le code ;
- vérifier l'arborescence et les scripts ;
- repérer les fonctionnalités réellement opérationnelles ;
- établir les risques et les points à préserver.

### Phase B — Stabiliser
- corriger les bugs bloquants ;
- sécuriser les flux de jeu sans casser la compatibilité ;
- corriger les erreurs de synchronisation ;
- corriger les problèmes de stickers/GIF ;
- vérifier les scripts et la configuration.

### Phase C — Refonte visuelle et expérience
- appliquer l'identité QSPICY ;
- refaire l'accueil et les parcours ;
- construire la scène de dialogue avec les deux personnages ;
- synchroniser les animations avec les vrais événements ;
- rendre les préférences indépendantes par joueur ;
- finaliser l'expérience mobile.

### Phase D — Vérification
- exécuter les scripts de lint, tests et build disponibles ;
- ajouter des tests ciblés là où c'est possible ;
- tester les scénarios à deux joueurs ;
- vérifier le mode réduction des animations ;
- vérifier les préférences locales ;
- vérifier les erreurs réseau et les états de chargement ;
- corriger les régressions trouvées.

### Phase E — Livraison
- committer les changements sur `genspark/qspicy-refonte` ;
- ne pas fusionner vers `main` ;
- ne pas déployer ;
- fournir le rapport final décrit ci-dessous.

Si une phase est bloquée par une permission, une limite d'environnement ou l'absence d'un secret, continue les autres tâches possibles et documente précisément le blocage.

---

## 11. Tests fonctionnels obligatoires

Au minimum, vérifier et consigner les résultats de ces scénarios :

| ID | Scénario | Résultat attendu |
|---|---|---|
| T01 | Un joueur crée une salle | La salle est créée et un code/lien utilisable est fourni |
| T02 | Le second joueur rejoint | Les deux joueurs apparaissent dans la même salle |
| T03 | Les deux joueurs démarrent | La partie commence sans état divergent |
| T04 | Un joueur répond | La réponse est enregistrée et synchronisée |
| T05 | Révélation des réponses | Les deux réponses s'affichent au bon moment |
| T06 | Un seul joueur valide la suite | La partie n'avance pas si deux validations sont requises |
| T07 | Le second joueur valide | La progression s'effectue une seule fois |
| T08 | Un joueur passe une question | La question est passée sans pénalité |
| T09 | Un joueur quitte | L'autre reçoit un état compréhensible |
| T10 | Rechargement d'une page | L'état est restauré ou une reprise claire est proposée |
| T11 | Sticker statique | Le sticker est rendu comme média, pas comme texte brut |
| T12 | GIF animé | Le GIF est correctement rendu ou un fallback apparaît |
| T13 | Thème modifié sur appareil A | Le thème de l'appareil B ne change pas |
| T14 | Réduction des animations | Le contenu reste visible et utilisable, sans animation superflue |
| T15 | Mobile 360 px | Aucun débordement ni chevauchement gênant |
| T16 | Déconnexion réseau | Un message d'état clair apparaît et la reprise est gérée |
| T17 | Build de production | La compilation se termine sans erreur |

Pour chaque test, indique : **Réussi / Échoué / Non testé**, avec une courte preuve ou explication. Ne coche pas « réussi » sur la seule base d'une lecture du code.

---

## 12. Livrables attendus

Créer ou mettre à jour les fichiers suivants dans le dépôt :

1. `docs/GENSPARK_AUDIT_INITIAL.md`
   - architecture observée ;
   - inventaire des fonctionnalités ;
   - bugs constatés ;
   - risques et éléments à préserver.

2. Le code de l'application refondu et corrigé, dans les dossiers existants appropriés.

3. `docs/GENSPARK_TEST_REPORT.md`
   - tests exécutés ;
   - résultats réels ;
   - environnements utilisés ;
   - bugs restants ;
   - éléments non testés.

4. `docs/GENSPARK_HANDOFF.md`
   - comment lancer le projet localement ;
   - commandes d'installation, développement et build ;
   - variables d'environnement nécessaires, sans valeurs secrètes ;
   - migrations éventuelles à appliquer manuellement ;
   - procédure de vérification avant mise en ligne ;
   - limites connues et étapes restantes.

5. Un résumé de livraison indiquant :
   - branche utilisée ;
   - dernier commit ;
   - liste des principaux fichiers modifiés ;
   - fonctionnalités réellement terminées ;
   - résultats des tests ;
   - points qui nécessitent encore une intervention humaine.

---

## 13. Définition de « terminé »

Le travail n'est pas terminé simplement parce que l'accueil est joli ou que le build passe.

Le travail est considéré comme livrable lorsque :
- le jeu à deux fonctionne réellement ;
- les fonctionnalités existantes importantes sont conservées ;
- l'identité QSPICY est cohérente sur les écrans ;
- les deux personnages et les bulles sont lisibles et leurs animations synchronisées ;
- le mode réduction des animations ne casse rien ;
- les préférences restent locales à chaque joueur ;
- les stickers et GIF ont un comportement correct ;
- les principaux scénarios multijoueurs ont été testés ;
- la compilation de production réussit ;
- les limites et actions manuelles restantes sont documentées ;
- aucun déploiement ou changement non autorisé n'a été effectué.

**Priorité absolue : une application fiable et réellement jouable avant les effets visuels.** Si tu dois arbitrer, corrige d'abord la logique multijoueur, la lisibilité, la stabilité et les bugs, puis termine les animations et les détails esthétiques.

---

## 14. Message de lancement à respecter

Commence par examiner le dépôt et les documents. Puis exécute le plan jusqu'à la livraison sur la branche autorisée. Tu as le droit de réorganiser le code si cela améliore clairement la qualité, mais évite les réécritures totales non nécessaires. Conserve les fonctionnalités utiles, protège les données et la production, teste chaque comportement important et fournis des preuves concrètes.

**Ne déploie pas. Ne touche pas à `main`. Livre une branche prête pour une revue finale humaine.**

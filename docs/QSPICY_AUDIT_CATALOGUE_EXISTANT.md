# QSPICY — audit éditorial du catalogue existant

Date : 24 novembre 2026  
Base auditée : `main`, fichier `src/catalog.json`  
Périmètre : lecture et analyse des 192 cartes. Aucun changement du catalogue applicatif ni de Supabase.

## 1. Résultat quantitatif vérifié

Le fichier `src/catalog.json` contient bien **192 cartes**.

| Niveau technique actuel (`level`) | Nombre |
|---|---:|
| 1 | 48 |
| 2 | 48 |
| 3 | 48 |
| 4 | 48 |
| **Total** | **192** |

Répartition par catégorie actuelle :

| Catégorie | Nombre |
|---|---:|
| `decouverte` | 32 |
| `complicite` | 37 |
| `profondeur` | 41 |
| `seduction` | 41 |
| `audacieux` | 41 |
| **Total** | **192** |

Répartition par format technique (`kind`) :

| Format | Nombre |
|---|---:|
| `free` | 66 |
| `secret` | 38 |
| `prediction` | 29 |
| `cross` | 25 |
| `challenge` | 34 |
| **Total** | **192** |

Contrôle de doublons : aucune carte n'a un texte strictement identique après normalisation des accents, de la casse et de la ponctuation. Ce contrôle ne suffit pas à exclure les doublons de sens.

## 2. Constat éditorial

### Points positifs

- Le catalogue est déjà organisé en cinq catégories et quatre niveaux techniques.
- Les formats ne se limitent pas aux questions libres : choix secret, prédiction, échange croisé et défi sont déjà présents.
- Les niveaux 3 et 4 abordent effectivement le désir, les fantasmes, les préférences sexuelles et les scénarios entre adultes.
- Plusieurs cartes encouragent une vraie réponse développée ou une réaction de l'autre joueur.

### Écarts par rapport à la nouvelle direction du propriétaire

1. **Quatre niveaux techniques, mais cinq intensités éditoriales demandées.** Le champ actuel `level` va de 1 à 4. Il ne faut pas le renommer ni le remplacer à l'aveugle. Ajouter une classification éditoriale distincte, par exemple `intensity` de 1 à 5, après vérification des usages dans le code et les données.
2. **Les niveaux 3 et 4 se recouvrent.** Plusieurs cartes de niveau 3 sont déjà très intimes, tandis que certaines cartes de niveau 4 parlent surtout de limites, de communication ou de choix d'ambiance. Le niveau technique ne représente donc pas toujours l'intensité réelle.
3. **Le niveau 4 n'est pas uniformément “extrême”.** Il contient des cartes vraiment directes, mais aussi plusieurs cartes de vérification des limites, de négociation ou de mise en confiance. Ces dernières sont utiles, mais ne doivent pas être comptées comme des questions HOT uniquement parce qu'elles sont au niveau 4.
4. **Répétitions thématiques.** Même sans doublon textuel exact, plusieurs cartes reviennent sur les mêmes angles : formuler une envie sexuelle, deviner le désir de l'autre, choisir une ambiance, décrire un scénario, nommer une limite ou demander une permission. Il faut comparer les intentions, pas seulement les chaînes de texte.
5. **Trop de formulations qui parlent d'un moment réel “ce soir” ou “maintenant”.** Le nouveau catalogue doit être autonome et ne pas dépendre de l'heure que l'application ne connaît pas. Les scénarios peuvent être fictifs, mais doivent être formulés sans supposer l'heure réelle.
6. **La liste de référence du propriétaire couvre des sujets absents ou trop peu représentés** : statut amoureux, crush, premier amour, ex, jalousie, expérience passée, dernier baiser, habitudes, goûts personnels, fierté, erreurs, talents, souvenirs, questions directes sur l'attirance entre les joueurs et défis de communication.
7. **La mécanique réciproque doit être plus visible dans les textes.** Une partie du catalogue est déjà conçue pour deux réponses simultanées, mais l'ensemble doit permettre naturellement : je choisis une question, je réponds ; l'autre choisit ensuite et répond ; chacun peut rebondir.

## 3. Décision de classification à appliquer

Conserver le champ technique `level` (1 à 4) tant que ses dépendances applicatives ne sont pas entièrement auditées.

Ajouter une classification éditoriale distincte :

| Intensité éditoriale | Repère | Cible de contenu |
|---|---|---|
| 1 | Doux 🥰 | Découverte, personnalité, goûts, souvenirs |
| 2 | Taquin 😏 | Crush, attirance, jalousie, séduction |
| 3 | Chaud 🔥 | Désirs, confidences intimes, expériences et préférences |
| 4 | Très chaud 🌶️ | Questions sexuelles directes, fantasmes, expériences détaillées |
| 5 | Extrême 🥵 | Provocations sexuelles très franches, fantasmes assumés et scénarios intimes audacieux |

Le champ `intensity` doit être attribué selon le contenu réel de chaque carte, pas recopié automatiquement depuis `level`.

## 4. Direction pour la nouvelle version du catalogue

Construire une version maître éditoriale qui :

- reprend les bonnes cartes existantes après réévaluation ;
- reprend et reformule intelligemment les idées pertinentes de la liste de 108 questions fournie par le propriétaire ;
- ajoute les thèmes personnels et relationnels insuffisamment couverts ;
- augmente nettement la densité et la variété des intensités 4 et 5 ;
- garde un vocabulaire adulte, direct et sans euphémismes systématiques ;
- évite les formulations qui dépendent de l'heure réelle ;
- contient des questions adressées à l'autre joueur et des questions sur la relation entre les deux ;
- sépare les questions, les choix secrets, les prédictions, les défis et les scénarios ;
- élimine les doublons de sens et les simples reformulations ;
- conserve les identifiants existants lorsque les cartes sont gardées, afin de limiter les risques de compatibilité.

Les interactions de partage d'images ou de voix restent des propositions volontaires. Aucun média intime ne doit être envoyé automatiquement ou exigé comme preuve.

## 5. Ordre d'exécution après cet audit

1. Produire une matrice des 192 cartes : garder, réécrire, déplacer d'intensité ou retirer.
2. Créer le catalogue maître enrichi et le faire relire avant intégration.
3. Ajouter la classification `intensity` de manière compatible, après audit des composants, scripts et schémas qui consomment `level`.
4. Vérifier le tirage sans répétitions immédiates et le comportement dans À Deux, DUOS et Personnalisé.
5. Exécuter les tests catalogue, synchronisation, typage et build.
6. Préparer une PR de code distincte. Ne pas fusionner, ne pas déployer et ne pas toucher à la base Supabase de production sans autorisation explicite.

## 6. Limites de cet audit

- Analyse faite sur le contenu du fichier GitHub `src/catalog.json`, pas sur les cartes effectivement chargées dans une session de production.
- Aucun test d'interface ou de parcours multijoueur n'a été exécuté pendant cet audit.
- Aucune migration ni modification applicative n'a été effectuée.
- Le contrôle automatique des doublons est lexical ; la détection des doublons de sens reste une étape éditoriale.

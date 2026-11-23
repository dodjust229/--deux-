# QSPICY — modèle de carte et règles de jeu

> Document de cadrage issu du cahier de référence du 23 novembre 2026.
> Il fixe le format des cartes avant l'écriture du catalogue complet. Aucune migration
> Supabase n'est appliquée : la section 7 décrit ce qu'il faudra faire, et rien de plus.

## 1. Champs d'une carte

| Champ | Type | Valeurs | Rôle |
|---|---|---|---|
| `id` | texte | `qsp-l<1-4>-<ques\|defi\|surp\|scen>-<nn>` | Identifiant stable, trié par niveau |
| `text` | texte | 20 à 260 caractères | La carte elle-même, telle qu'elle s'affiche |
| `type` | énum | voir §2 | Format d'interaction |
| `level` | entier | 1 à 4 | Étape officielle |
| `category` | énum | 13 catégories éditoriales | Classement de contenu |
| `context` | énum | `tous`, `rencontre`, `decouverte`, `couple`, `intimite` | À qui la carte s'adresse |
| `modes` | liste | `duo`, `duos`, `personnalise` | Où la carte peut apparaître |
| `intensity` | entier | 1 à 5 | Audace réelle de la carte |
| `emoji` | texte | un emoji | Repère visuel discret |
| `duration` | énum | `courte`, `moyenne`, `longue` | Temps de réponse attendu |
| `visibility` | énum | `partagee`, `anonyme`, `privee` | Qui voit la réponse |
| `skip_allowed` | booléen | toujours `true` | Droit de passer, non négociable |
| `consent_note` | texte | 10 à 220 caractères | Rappel de consentement propre à la carte |

Catégories : `seduction`, `humour`, `premieres-impressions`, `confiance`, `confidences`,
`desirs`, `preferences-intimes`, `fantasmes`, `experiences`, `sexualite-communication`,
`redecouverte`, `scenarios`, `limites-defis`.

## 2. Formats et comportement à l'écran

| `type` | Libellé | Ce que fait l'application |
|---|---|---|
| `QUESTION` | Question | Chacun répond librement, les deux réponses se révèlent ensemble |
| `PRISE_DE_POSITION` | Prise de position | Réponse courte et assumée, sans débat obligatoire |
| `ACTION_GESTE` | Action / geste | Consigne à réaliser hors écran, puis récit court ; jamais de preuve exigée |
| `POSTURE` | Posture | Consigne corporelle très légère, à faire seul·e, puis ressenti décrit |
| `DESCRIPTION` | Description | Réponse contrainte (trois mots, une image, une scène) |
| `SCENARIO` | Scénario | Récit guidé, avec un cadre explicite (lieu, durée, limite) |
| `PROVOCATION` | Provocation | Question ou défi frontal mais jamais humiliant |
| `DUEL_MIROIR` | Duel / miroir | Même consigne pour les deux, comparaison sans score ni gagnant |
| `SURPRISE` | Carte surprise | Interrompt la séquence ; peut être refusée comme n'importe quelle carte |

Règle transverse : aucun format n'exige une preuve, une photo, un contact physique ou une
réponse explicite. Une consigne se raconte, elle ne se prouve pas.

## 3. Niveaux

Les quatre étapes du cahier, avec leur intensité de référence :

| Niveau | Nom | `intensity` attendue |
|---|---|---|
| 1 | Ça commence à piquer | 1 à 2 |
| 2 | La tension monte | 2 à 3 |
| 3 | Mode QSPICY / Anonymous | 3 à 4 |
| 4 | Les questions qui font screenshot | 4 à 5 |

Règles de partie :

- le niveau de départ est choisi par les deux joueurs au lancement, pas imposé ;
- la progression suit l'ordre des niveaux mais reste non linéaire : chacun peut demander à
  revenir en arrière, sauter une carte ou arrêter ;
- les cartes des niveaux 3 et 4 ne sont tirées que si les deux joueurs ont choisi ce niveau
  (même logique que le mode 18+ actuel, étendue) ;
- aucune carte n'est verrouillée derrière une autre : le refus n'a jamais de coût.

## 4. Visibilité et Anonymous

| `visibility` | Ce que voit l'autre | Ce que dit l'application |
|---|---|---|
| `partagee` | la réponse et son auteur, à la révélation | « Vos réponses apparaîtront ensemble » |
| `anonyme` | la réponse, sans le prénom | « Réponse anonyme : ton prénom n'apparaîtra pas. L'application peut techniquement relier une réponse à un joueur ; elle ne l'affiche jamais. » |
| `privee` | rien, jamais | « Réponse privée : elle reste pour toi. » |

Anonymous est une mécanique transversale : une carte peut être anonyme à n'importe quel
niveau, et l'écran doit dire clairement qui voit quoi **avant** la saisie. Ne jamais promettre
un anonymat absolu.

## 5. Consentement

- `skip_allowed` reste `true` partout. Une carte qui exige de répondre est un défaut de conception.
- Chaque carte porte une `consent_note` concrète : ce qui est attendu, ce qui ne l'est pas, et
  le droit de s'arrêter.
- Passer, changer de niveau, quitter : sans justification, sans pénalité, sans effet sur la suite.
- Une permission générale ne vaut pas consentement permanent : la note de carte le rappelle à
  chaque fois que le contenu est intime.
- Aucune image intime, aucun déshabillage, aucun acte imposé, aucune capture d'écran promise
  comme impossible.

## 6. Le pilote livré

`content/pilot/qspicy-pilot.json` (intégration) et `content/pilot/qspicy-pilot.csv` (relecture)
contiennent 30 cartes originales :

| Famille | Nombre | Exemples de formats |
|---|---|---|
| Questions | 10 | question, prise de position, description, duel/miroir |
| Défis | 8 | action/geste, posture, provocation |
| Cartes surprises | 6 | surprise |
| Scénarios | 6 | scénario |
| **Total** | **30** | |

Répartition : niveau 1 = 7, niveau 2 = 9, niveau 3 = 7, niveau 4 = 7. Les neuf formats sont
représentés au moins une fois. Trois cartes sont anonymes, une est privée.

Vérification automatique :

```bash
npm run cards:check   # schéma, doublons, bandes d'intensité, comptages, CSV synchronisé
npm run cards:csv     # régénère le CSV depuis le JSON
```

## 7. Intégration future (non appliquée)

Le catalogue actuel (`catalog.id/category/kind/options`) ne connaît pas les niveaux. Quand le
pilote sera validé, l'intégration demandera :

1. une migration additive : `alter table public.catalog add column level int not null default 1`
   (réversible, aucune donnée supprimée) ;
2. `start_game` qui accepte le niveau de départ et filtre les cartes ;
3. `get_room_snapshot` qui masque l'auteur d'une réponse `anonyme` et n'envoie jamais une
   réponse `privee` à l'autre joueur ;
4. la correspondance `type` → `kind` existant pour l'affichage, sans casser les 43 cartes
   actuelles ni les parties en cours.

Ces points ne sont pas exécutés : ils feront l'objet d'un fichier SQL versionné, soumis à
autorisation avant application.

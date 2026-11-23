# QSPICY — modèle de carte et règles de jeu

> Document de cadrage issu du cahier de référence du 23 novembre 2026, mis à jour en **v1.1**
> (audiences DUOS, format CONFIDENCE, règles de visibilité).
> Aucune migration Supabase n'est appliquée : la section 8 décrit ce qu'il faudra faire.

## 1. Champs d'une carte

| Champ | Type | Valeurs | Rôle |
|---|---|---|---|
| `id` | texte | `qsp-l<1-4>-<ques\|defi\|surp\|scen>-<nn>` | Identifiant stable, trié par niveau |
| `text` | texte | 20 à 260 caractères | La carte elle-même, telle qu'elle s'affiche |
| `type` | énum | 10 formats (§2) | Format d'interaction |
| `audience` | énum | 5 audiences (§3) | Qui reçoit la carte |
| `level` | entier | 1 à 4 | Étape officielle |
| `category` | énum | 13 catégories éditoriales | Classement de contenu |
| `context` | énum | `tous`, `rencontre`, `decouverte`, `couple`, `intimite` | À qui la carte s'adresse |
| `modes` | liste | `duo`, `duos`, `personnalise` | Où la carte peut apparaître |
| `intensity` | entier | 1 à 5 | Audace réelle de la carte |
| `emoji` | texte | un emoji | Repère visuel discret |
| `duration` | énum | `courte`, `moyenne`, `longue` | Temps de réponse attendu |
| `visibility` | énum | `partagee`, `anonyme`, `privee` | Comment la réponse est montrée |
| `skip_allowed` | booléen | toujours `true` | Droit de passer, non négociable |
| `consent_note` | texte | 10 à 220 caractères | Rappel de consentement propre à la carte |

Catégories : `seduction`, `humour`, `premieres-impressions`, `confiance`, `confidences`,
`desirs`, `preferences-intimes`, `fantasmes`, `experiences`, `sexualite-communication`,
`redecouverte`, `scenarios`, `limites-defis`.

`audience` a été ajouté en v1.1 : sans lui, le texte d'une carte devient ambigu dès que
quatre joueurs sont en jeu (partenaire ? duo ? les deux duos ?). C'est le seul champ nouveau.

## 2. Formats et comportement à l'écran

| `type` | Libellé | Ce que fait l'application |
|---|---|---|
| `QUESTION` | Question | Chacun répond librement, les réponses se révèlent ensemble |
| `PRISE_DE_POSITION` | Prise de position | Choix assumé entre deux options, sans débat obligatoire |
| `ACTION_GESTE` | Action / geste | Consigne à faire hors écran, puis récit court ; jamais de preuve exigée |
| `POSTURE` | Posture | Consigne corporelle très légère, à faire seul·e, puis ressenti décrit |
| `DESCRIPTION` | Description | Réponse contrainte (trois mots, une image, une scène) |
| `SCENARIO` | Scénario | Récit guidé, avec un cadre explicite (lieu, durée, limite) |
| `PROVOCATION` | Provocation | Question ou défi frontal mais jamais humiliant |
| `DUEL_MIROIR` | Duel / miroir | Même consigne pour les deux, comparaison sans score ni gagnant |
| `SURPRISE` | Carte surprise | Interrompt la séquence ; se refuse comme n'importe quelle carte |
| `CONFIDENCE` | Confidence | Le joueur confie un fait, un souvenir ou une limite ; jamais de preuve, jamais d'obligation |

`CONFIDENCE` est le dixième format, ajouté en v1.1 : les cartes 15 et 16 demandaient une
confidence et étaient classées « geste » et « posture ». Une confidence n'est ni un geste
ni une posture, et son traitement de visibilité est différent.

Règle transverse : aucun format n'exige une preuve, une photo, un contact physique ou une
réponse explicite. Une consigne se raconte, elle ne se prouve pas.

## 3. Audiences

| `audience` | Qui reçoit la carte | Où elle se joue |
|---|---|---|
| `partner` | la personne avec qui je suis en duo (mon/ma partenaire) | duo, duos |
| `own_duo` | les deux membres de mon duo, moi compris | duo, duos |
| `other_duo` | le duo opposé | duos uniquement |
| `all_players` | les quatre joueurs | duos uniquement |
| `individual_choice` | l'audience que je choisis au moment d'envoyer (partenaire, mon duo, tout le monde) | duo, duos, personnalisé |

Règles vérifiées automatiquement :

- `other_duo` et `all_players` sont réservés au mode `duos` : une carte qui parle à « l'autre
  duo » n'a aucun sens à deux ;
- le mode `personnalise` n'accepte que les audiences intimes (`partner`, `own_duo`,
  `individual_choice`) ;
- le texte d'une carte ne doit pas contredire son audience : une carte `other_duo` dit
  « l'autre duo », une carte `all_players` dit « vous quatre », une carte `partner` parle à
  une seule personne.

## 4. Mécaniques DUOS

Quatre joueurs, deux duos fixes, trois espaces : le salon collectif, le salon privé du duo A,
le salon privé du duo B. Aucun score, aucun classement, aucun gagnant.

| Mécanique | Espaces | Cartes concernées |
|---|---|---|
| Entre nous | salon privé du duo | `own_duo`, `partner` |
| Face à face | salon collectif | `other_duo` |
| Qui connaît son partenaire ? | duo puis collectif | `partner` avec révélation croisée |
| Défi croisé | collectif | `other_duo`, `all_players` |

Une interaction croisée (réponse montrée à l'autre duo ou aux quatre) exige l'autorisation
individuelle de chaque personne concernée au moment de la révélation : personne ne peut
publier la réponse d'un autre, ni changer ses préférences à sa place.

## 5. Niveaux

| Niveau | Nom | `intensity` attendue |
|---|---|---|
| 1 | Ça commence à piquer | 1 à 2 |
| 2 | La tension monte | 2 à 3 |
| 3 | Mode QSPICY / Anonymous | 3 à 4 |
| 4 | Les questions qui font screenshot | 4 à 5 |

- le niveau de départ est choisi par les joueurs, pas imposé ;
- la progression suit l'ordre des niveaux mais reste non linéaire : retour en arrière, saut
  de carte et arrêt sont toujours possibles ;
- les cartes des niveaux 3 et 4 ne sont tirées que si les joueurs ont choisi ce niveau ;
- aucune carte n'est verrouillée derrière une autre : le refus n'a jamais de coût.

## 6. Visibilité, Anonymous et consentement

| `visibility` | Ce que voit le destinataire | Ce que dit l'application |
|---|---|---|
| `partagee` | la réponse et son auteur, à la révélation | « Vos réponses apparaîtront ensemble » |
| `anonyme` | la réponse, sans le prénom | « Réponse anonyme : ton prénom n'apparaîtra pas. L'application peut techniquement relier une réponse à un joueur ; elle ne l'affiche jamais. » |
| `privee` | rien, jamais | « Réponse privée : elle reste pour toi. » |

- `anonyme` n'est autorisé que devant un groupe (`all_players`, `other_duo`) ou à audience
  choisie : on n'est pas anonyme devant la personne avec qui on joue.
- `privee` n'est autorisé qu'avec une audience intime, et la réponse ne part jamais vers
  l'autre joueur.
- `skip_allowed` reste `true` partout ; une carte qui exige de répondre est un défaut.
- Chaque carte porte une `consent_note` concrète : ce qui est attendu, ce qui ne l'est pas,
  et le droit de s'arrêter.
- Aucune image intime, aucun déshabillage, aucun acte imposé ; ne jamais promettre qu'une
  capture d'écran est impossible.

## 7. Le pilote livré (v1.1)

`content/pilot/qspicy-pilot.json` (intégration) et `content/pilot/qspicy-pilot.csv`
(relecture) : 30 cartes originales.

| Famille | Nombre |
|---|---|
| Questions | 10 |
| Défis | 8 |
| Cartes surprises | 6 |
| Scénarios | 6 |

Niveaux : 1 = 7, 2 = 9, 3 = 7, 4 = 7. Formats : 10 sur 10 représentés.
Audiences : `partner` 15, `own_duo` 7, `other_duo` 3, `all_players` 3,
`individual_choice` 2. Trois cartes anonymes, une privée.

Vérification :

```bash
npm run cards:check   # schéma, doublons, bandes d'intensité, audiences, formats, CSV
npm run cards:csv     # régénère le CSV depuis le JSON
```

## 8. Intégration future (non appliquée)

Quand le pilote sera validé, l'intégration demandera :

1. une migration additive : `alter table public.catalog add column level int not null default 1`
   et `add column audience text not null default 'partner'` (réversible, aucune donnée perdue) ;
2. `start_game` qui accepte le niveau de départ et filtre les cartes ;
3. `get_room_snapshot` qui masque l'auteur d'une réponse `anonyme` et n'envoie jamais une
   réponse `privee` à un autre joueur ;
4. la correspondance `type` → `kind` existant pour l'affichage, sans casser les 43 cartes
   actuelles ni les parties en cours ;
5. le modèle de salle à quatre places et trois espaces, nécessaire aux audiences
   `other_duo` et `all_players` — phase séparée, spécifiée avant d'être codée.

Rien de tout cela n'est exécuté : ces points feront l'objet d'un fichier SQL versionné,
soumis à autorisation avant application.

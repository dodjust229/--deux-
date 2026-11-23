# QSPICY — rapport de validation du catalogue pilote v1.1

> Branche `genspark/qspicy-catalogue-v1.1`, créée depuis `genspark/qspicy-refonte` (`17dea52`)
> puis synchronisée avec `main` (commit de fusion `3a2d955`).
> Aucune carte supprimée, aucun niveau modifié, aucune intégration applicative, aucune
> modification Supabase, aucun déploiement.

## 1. Ce qui a été fait

1. Ajout du champ `audience` (5 valeurs) aux 30 cartes, avec rédaction adaptée quand le texte
   devenait ambigu à quatre joueurs.
2. Création du dixième format `CONFIDENCE` et reclassement des cartes 15 et 16 signalées.
3. Réécriture des formulations génériques ou hors sujet (cartes 3, 6, 7, 10, 14, 19, 20, 25,
   27, 28, 30), sans augmenter l'intensité.
4. Resserrement de deux cartes (12, 15) et correction des modes en fonction de l'audience.
5. Mise à jour du validateur, du modèle de carte, du JSON et du CSV.

## 2. Résultat du validateur

```text
$ node scripts/cards.mjs --csv
✓ content/pilot/qspicy-pilot.csv écrit (30 cartes).
  familles : ques=10 · defi=8 · surp=6 · scen=6
  niveaux  : L1=7 · L2=9 · L3=7 · L4=7
  audiences: partner=15 · own_duo=7 · all_players=3 · individual_choice=2 · other_duo=3
  formats  : 10/10 représentés

$ npm run cards:check
✓ Catalogue pilote valide et CSV synchronisé (30 cartes).
```

## 3. Contrôles demandés

| Contrôle | Résultat | Détail |
|---|---|---|
| 30 identifiants uniques | Réussi | 30 `id` distincts, format `qsp-l<1-4>-<famille>-<nn>` |
| Doublons de contenu | Réussi | comparaison sur le texte normalisé (casse, espaces, guillemets) |
| Quatre niveaux | Réussi | L1 = 7, L2 = 9, L3 = 7, L4 = 7 |
| Dix formats | Réussi | 10/10 représentés, `CONFIDENCE` inclus |
| Valeurs d'audience | Réussi | 5 valeurs autorisées, chacune au moins 2 cartes |
| Cohérence JSON / CSV | Réussi | CSV régénéré avec BOM UTF-8, identique au JSON |
| Informations de consentement | Réussi | `consent_note` présente partout, `skip_allowed` toujours `true` |
| Champs obligatoires | Réussi | 15 champs, aucun inconnu, aucun manquant |
| Bandes d'intensité | Réussi | 1→1-2, 2→2-3, 3→3-4, 4→4-5 respectées par les 30 cartes |
| Audiences vs modes | Réussi | `other_duo` et `all_players` uniquement en `duos` ; pas de `personnalise` collectif |
| Visibilité vs audience | Réussi | anonyme réservé au groupe, privée réservée aux audiences intimes |

Tests du dépôt (inchangés par cette livraison, exécutés pour non-régression) :

```text
npm test → 21 tests unitaires réussis
           ✓ Catalogue synchronisé (43 interactions)
           ✓ Catalogue pilote valide et CSV synchronisé (30 cartes)
npm run build → construit sans erreur
```

## 4. Résumé des modifications des 30 cartes

Légende : **A** = audience ajoutée, **T** = texte réécrit, **F** = format corrigé,
**M** = modes ajustés. Toutes les cartes ont reçu leur audience.

| # | Id | Audience | Modif. | Ce qui change |
|---|---|---|---|---|
| 1 | `qsp-l1-ques-01` | partner | A | — |
| 2 | `qsp-l1-ques-02` | partner | A | — |
| 3 | `qsp-l1-ques-03` | own_duo | A, T, M | Position à deux, concrète : conversation jusqu'à 2 h ou silence |
| 4 | `qsp-l2-ques-04` | partner | A | — |
| 5 | `qsp-l2-ques-05` | partner | A | — |
| 6 | `qsp-l3-ques-06` | all_players | A, T, M | Question philosophique remplacée par une situation vécue sur l'anonymat ; anonyme conservé |
| 7 | `qsp-l3-ques-07` | individual_choice | A, T, M | « Limite fière » devient « la fois où dire non a soulagé » + choix de qui l'entend |
| 8 | `qsp-l4-ques-08` | partner | A | — |
| 9 | `qsp-l4-ques-09` | partner | A | — (réponse privée conservée) |
| 10 | `qsp-l2-ques-10` | own_duo | A, T, M | Miroir : le défaut le plus attirant, et celui qu'on assume |
| 11 | `qsp-l1-defi-11` | partner | A | — |
| 12 | `qsp-l1-defi-12` | partner | A, T | Ajout de « et si tu as aimé », plus incarné |
| 13 | `qsp-l2-defi-13` | partner | A | — |
| 14 | `qsp-l2-defi-14` | other_duo | A, T, M | Devient un face-à-face : la question indiscrète est posée à l'autre duo |
| 15 | `qsp-l3-defi-15` | own_duo | A, F, T | `ACTION_GESTE` → `CONFIDENCE` ; texte resserré (sans son nom, sans le tien) |
| 16 | `qsp-l3-defi-16` | individual_choice | A, F, T, M | `POSTURE` → `CONFIDENCE` ; choix explicite de qui entend la confidence |
| 17 | `qsp-l4-defi-17` | partner | A | — |
| 18 | `qsp-l4-defi-18` | partner | A | — |
| 19 | `qsp-l1-surp-19` | other_duo | A, T, M | Film de l'autre duo, choisi par l'autre duo |
| 20 | `qsp-l2-surp-20` | own_duo | A, T, M | Passé au « à deux, choisissez… » |
| 21 | `qsp-l2-surp-21` | partner | A, M | Mode personnalisé ajouté |
| 22 | `qsp-l3-surp-22` | all_players | A, M | Déjà collective et anonyme, restrictions de mode |
| 23 | `qsp-l3-surp-23` | own_duo | A, M | — |
| 24 | `qsp-l4-surp-24` | partner | A | — |
| 25 | `qsp-l1-scen-25` | other_duo | A, T, M | L'autre duo improvise la rencontre |
| 26 | `qsp-l2-scen-26` | partner | A | — |
| 27 | `qsp-l2-scen-27` | all_players | A, T, M | « Vous quatre » au lieu d'un « on » ambigu |
| 28 | `qsp-l3-scen-28` | own_duo | A, T, M | « chacun espère que l'autre raconte » |
| 29 | `qsp-l4-scen-29` | partner | A | — |
| 30 | `qsp-l4-scen-30` | own_duo | A, T, M | « À deux, décrivez… » |

Aucune carte n'a été supprimée. Aucune intensité n'a été augmentée : les bandes par niveau
sont identiques à la v1.

## 5. Consentement et confidentialité dans le contenu

- les 30 cartes portent une `consent_note` propre, et `skip_allowed` reste `true` partout ;
- aucune carte n'exige de photo, de preuve ou de geste physique ;
- `privee` (carte 9) n'est jamais publiée ; `anonyme` (cartes 6 et 22) ne s'applique que
  devant un groupe, avec la mention honnête que la liaison technique reste possible ;
- les interactions croisées (`other_duo`, `all_players`) sont documentées comme exigeant
  l'autorisation individuelle des personnes concernées au moment de la révélation.

## 6. Limites connues

1. Le champ `audience` et le format `CONFIDENCE` ne sont pas encore gérés par l'application :
   le pilote est validé en tant que données, pas branché.
2. Les audiences `other_duo` et `all_players` supposent le mode DUOS (quatre joueurs, trois
   espaces), qui n'existe pas côté serveur : c'est une phase séparée.
3. L'anonymat réel devra être appliqué côté serveur (`get_room_snapshot`) avant toute mise en
   service ; le masquage côté navigateur ne suffirait pas.
4. La relecture éditoriale humaine reste la dernière étape : le validateur vérifie la forme,
   pas le goût.

## 7. Livrables

- `content/pilot/qspicy-pilot.json` — 30 cartes v1.1, prêtes à intégrer ;
- `content/pilot/qspicy-pilot.csv` — même contenu, BOM UTF-8, lisible dans Excel ;
- `docs/MODELE_CARTE.md` — modèle actualisé (15 champs, 10 formats, audiences, DUOS) ;
- `scripts/cards.mjs` — validateur étendu (audiences, modes, visibilité, intensités) ;
- ce rapport ;
- branche `genspark/qspicy-catalogue-v1.1` poussée sur GitHub.

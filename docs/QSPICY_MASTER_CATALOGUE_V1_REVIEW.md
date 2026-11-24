# QSPICY — assemblage et validation structurelle du catalogue maître V1

Date : 24 novembre 2026  
Fichier maître : `content/draft/qspicy-master-catalogue-v1.json`  
Statut : brouillon éditorial, non intégrable dans l'application.

## 1. Composition

Le catalogue maître de travail contient **220 cartes** :
- 180 cartes issues du catalogue actif après retrait provisoire de 12 cartes proposées à la fusion ;
- 6 cartes existantes dont le prompt a été réorienté pour réduire les répétitions ;
- 40 nouvelles propositions V2, soit 8 par intensité.

Les identifiants des cartes existantes conservées sont préservés. Les nouvelles cartes utilisent des identifiants distincts (`n001` à `n040`).

## 2. Répartition proposée par intensité éditoriale

| Intensité | Nombre |
|---|---:|
| 1 — Doux | 52 |
| 2 — Taquin | 53 |
| 3 — Chaud | 32 |
| 4 — Très chaud | 47 |
| 5 — Extrême | 36 |
| **Total** | **220** |

La répartition est une proposition de travail, pas une décision finale. Les 192 cartes historiques ont été reclassées selon leur contenu, sans recopier mécaniquement le niveau technique.

## 3. Contrôles structurels effectués

- JSON relu et parsé sans erreur.
- 220 cartes présentes.
- 220 identifiants uniques.
- Aucun champ obligatoire manquant dans le brouillon (identifiant, titre, prompt, niveau technique, intensité).
- Toutes les valeurs `level` restent dans la plage technique 1–4.
- Toutes les valeurs `intensity` restent dans la plage éditoriale 1–5.
- Les 40 nouveaux identifiants sont uniques.
- Contrôle lexical intra-catalogue effectué après assemblage : 17 paires restent proches par vocabulaire, mais correspondent à des angles ou mécaniques différents (par exemple souvenir sensuel vs souvenir général, choix d'un sujet sexuel vs choix d'un scénario, ou rythme vs dynamique). Ces proximités restent signalées pour une dernière revue humaine.

## 4. Réécritures effectuées dans le brouillon

- `d17` : réorientée vers le rythme personnel de la journée, plutôt qu'un second choix du moment idéal à deux.
- `e10` : réorientée vers une qualité dans la manière de traiter les autres, pour sortir du compliment physique répété.
- `c09` : réorientée vers ce qui freine le premier pas, plutôt que de répéter « qui fera le premier pas ? ».
- `d03` : réorientée vers une activité qui fait perdre la notion du temps, plutôt qu'un nouveau choix de soirée.
- `f23` : réorientée vers les sources de tension dans la séduction, plutôt qu'un second choix de scénario sexuel.
- `g07` : réorientée vers un défi verbal adulte concret, plutôt qu'un choix générique de défi.

## 5. Répartition technique : pourquoi le fichier n'est pas intégrable

Le brouillon compte 52 cartes de niveau technique 1, 53 de niveau 2, 54 de niveau 3 et 61 de niveau 4. Or le script actuel `catalog:check` exige exactement 48 cartes dans chacun des quatre niveaux, et les RPC Supabase utilisent ce niveau pour le tirage.

Les nouvelles cartes ont reçu un niveau technique provisoire (intensités 1–3 vers niveaux 1–3 ; intensités 4–5 vers niveau 4). Ce mapping ne doit pas être pris comme validation technique.

Le fichier maître ne doit donc **pas** être copié dans `src/catalog.json`, synchronisé vers SQL, migré en base ou déployé en l'état. Il faut décider d'abord comment conserver l'équilibre technique de 48 cartes par niveau et comment le champ éditorial `intensity` doit coexister avec le moteur actuel.

## 6. Prochaine étape avant clôture éditoriale

1. Relecture humaine des 220 prompts, en particulier des intensités 4 et 5.
2. Décision définitive sur les 12 fusions et les 6 réécritures.
3. Revue des formulations temporelles restantes.
4. Ajustement de la répartition technique pour respecter les contraintes de l'application, sans confondre `level` et `intensity`.
5. Seulement ensuite, préparation d'une PR applicative distincte et de ses tests.

## 7. Périmètre inchangé

Le catalogue maître est un fichier de travail dans `content/draft/`. Le catalogue actif, le code applicatif, les migrations Supabase et la production n'ont pas été modifiés. Aucun déploiement n'a eu lieu.

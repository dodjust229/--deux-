# QSPICY — revue finale du catalogue maître V2

Date : 24 novembre 2026  
Fichier de référence : `content/draft/qspicy-master-catalogue-v2.json`  
Statut : catalogue éditorial consolidé, en attente de validation humaine avant toute intégration.

## 1. Composition du catalogue

Le fichier contient 220 cartes :
- 180 cartes issues du catalogue actuel, après mise à l'écart provisoire de 12 cartes retenues pour fusion ;
- 40 nouvelles cartes, réparties exactement à raison de 8 par intensité ;
- 6 prompts historiques réécrits pour réduire les répétitions, sans changer leurs identifiants.

Les cartes historiques conservées gardent leurs identifiants. Les 40 nouvelles cartes utilisent les identifiants `n01` à `n40`.

## 2. Répartition éditoriale finale

| Intensité | Nombre de cartes | Ligne éditoriale |
|---|---:|---|
| 1 — Doux | 52 | Découverte, histoire personnelle, premiers liens |
| 2 — Taquin | 53 | Crush, ex, jalousie, attirance et signaux |
| 3 — Chaud | 49 | Confidences, expériences, sujets intimes et communication sexuelle |
| 4 — Très chaud | 32 | Désirs explicites, préférences concrètes, masturbation, porno, positions et sexe oral |
| 5 — Extrême | 34 | Fantasmes précis, pratiques, expériences sexuelles et confessions directes |
| **Total** | **220** | |

Les intensités 4 et 5 ont été réévaluées : les cartes qui parlaient surtout de limites, de communication ou de confiance sans être réellement très chaudes ont été reclassées au niveau 3. Les cartes franchement sexuelles ou provocatrices restent aux niveaux 4 et 5.

Les 40 nouvelles cartes restent exactement équilibrées : 8 par intensité.

## 3. Nettoyage des formulations

Les formulations dépendant de l'heure réelle ont été réécrites dans le catalogue maître :
- suppression des références comme « ce soir », « demain », « maintenant », « cette semaine » ou « dans cinq minutes » lorsqu'elles supposaient que l'application connaissait le contexte du joueur ;
- conservation des horizons hypothétiques utiles, par exemple un projet à réaliser dans les six prochains mois ;
- les formulations sont désormais jouables à n'importe quel moment.

Contrôle automatisé après réécriture : **aucune occurrence des expressions temporelles ciblées** dans les titres ou prompts.

## 4. Contrôles de structure

Contrôle du JSON V2 :
- 220 cartes présentes ;
- 220 identifiants uniques, tous au format attendu par le catalogue actuel ;
- aucun titre dupliqué après normalisation ;
- toutes les catégories sont parmi les cinq catégories applicatives autorisées ;
- tous les types de cartes sont parmi les cinq types autorisés ;
- tous les champs obligatoires sont présents ;
- tous les `level` sont dans la plage technique 1–4 ;
- toutes les `intensity` sont dans la plage éditoriale 1–5 ;
- chaque prompt contient un emoji ;
- les cartes de type défi ou question croisée restent formulées en question ;
- les cartes de choix secret ont leurs options.

**Résultat du contrôle : 0 erreur structurelle.**

## 5. Proximités sémantiques

Une comparaison lexicale de toutes les paires du catalogue a fait ressortir 17 rapprochements. Ils ont été relus : ils correspondent à des mécaniques ou des angles distincts (par exemple souvenir sensuel vs souvenir général, choix d'un sujet sexuel vs choix d'un scénario, ou rythme intime vs dynamique de jeu). Aucun doublon sémantique direct n'a été retenu dans cette dernière revue.

Cette vérification ne remplace pas le dernier regard éditorial humain sur le ton et la pertinence de chaque carte.

## 6. Compatibilité technique — blocage volontaire

Le catalogue actif compte actuellement 192 cartes, avec exactement 48 cartes par niveau technique. Le brouillon V2 en compte 220 et présente cette répartition technique :
- niveau 1 : 52 ;
- niveau 2 : 53 ;
- niveau 3 : 54 ;
- niveau 4 : 61.

Le script `catalog:check` exige encore 48 cartes par niveau. **Le catalogue V2 ne doit donc pas être copié dans `src/catalog.json` ni synchronisé vers Supabase.**

Le champ `level` reste technique (1–4). Le champ `intensity` est éditorial (1–5) et n'est pas encore consommé par le moteur. Il faudra décider séparément comment intégrer le nouveau champ et comment faire évoluer la contrainte de répartition, avec des tests applicatifs et SQL.

## 7. Statut final du travail éditorial

- Direction éditoriale documentée.
- Audit des 192 cartes réalisé.
- Répétitions internes repérées et décisions proposées.
- 40 nouvelles questions préparées et réparties sur les cinq intensités.
- Catalogue maître V2 assemblé et contrôlé structurellement.
- Formulations dépendantes du temps réel corrigées.
- Intensités 4 et 5 réévaluées pour rester réellement adultes et explicites.

Le travail éditorial préparatoire est consolidé. L'intégration dans l'application et la base de données constitue une étape technique distincte, non effectuée ici. Aucun changement de production ni déploiement n'a eu lieu.

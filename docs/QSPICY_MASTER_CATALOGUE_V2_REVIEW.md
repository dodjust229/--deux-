# QSPICY — revue finale du catalogue maître V2

Date : 24 novembre 2026  
Fichier de référence : `content/draft/qspicy-master-catalogue-v2.json`  
Statut : catalogue V2 intégré dans la branche `integrate/qspicy-master-catalogue-v2`, PR #33 ouverte ; aucun déploiement effectué.

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

## 6. Intégration technique du catalogue V2

Le catalogue actif de l'application est remplacé par les 220 cartes du master V2 dans `src/catalog.json`. La contrainte historique de 48 cartes par niveau a été retirée du contrôle de synchronisation : les niveaux techniques restent 1–4, avec la répartition 52 / 53 / 54 / 61.

Le champ éditorial `intensity` (1–5) est désormais :
- obligatoire dans le type TypeScript `Interaction` ;
- persisté dans `public.catalog` ;
- inclus dans le SQL généré et la migration `22_catalogue_maitre_v2.sql` ;
- affiché sur les cartes en Couple, DUOS et dans l'aperçu Personnalisé ;
- utilisé par le contrôle 18+ du mode Personnalisé.

La migration 22 réinsère les 220 cartes et retire les identifiants qui ne font plus partie du master, sans supprimer les salles ni les réponses. Elle doit être exécutée dans Supabase avant tout déploiement.

## 7. Statut final du travail éditorial

- Direction éditoriale documentée.
- Audit des 192 cartes réalisé.
- Répétitions internes repérées et décisions proposées.
- 40 nouvelles questions préparées et réparties sur les cinq intensités.
- Catalogue maître V2 assemblé et contrôlé structurellement.
- Formulations dépendantes du temps réel corrigées.
- Intensités 4 et 5 réévaluées pour rester réellement adultes et explicites.

Le remplacement du catalogue et son intégration applicative sont préparés dans la PR #33. Les vérifications automatisées sont en cours. Aucune base Supabase de production n'a été modifiée et aucun déploiement n'a eu lieu.

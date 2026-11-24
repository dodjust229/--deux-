# QSPICY — contrôle du lot additionnel V2

Date : 24 novembre 2026  
Base de comparaison : 192 cartes de `src/catalog.json` contre 40 propositions de `content/draft/qspicy-master-additions-v2.json`.

## 1. Ce qui change par rapport à V1

Le lot V1 comportait plusieurs reformulations de questions déjà présentes. Le lot V2 a été reconstruit autour de sujets insuffisamment couverts par le catalogue : premier amour, statut amoureux, ex, jalousie, dernier baiser, erreurs personnelles, expériences sentimentales, masturbation, pornographie, préférences sexuelles concrètes, sexe oral, positions, jeux de rôle et expériences intimes passées.

Les quatre propositions les plus proches d'angles existants ont été reformulées :
- le dernier baiser est désormais situé avant la rencontre entre les deux joueurs, au lieu de redemander ce qui rend un baiser mémorable ;
- la question sur les paroles pendant le sexe a été remplacée par une comparaison explicite entre sexe oral et pénétration ;
- la question sur domination/soumission a été remplacée par une question sur la simulation de plaisir ;
- la question générique sur les pratiques refusées ou intrigantes a été recentrée sur une pratique acceptée par curiosité puis regrettée, ou découverte et appréciée.

## 2. Contrôle de proximité

Un contrôle lexical a comparé les 40 propositions aux 192 cartes. Six propositions dépassent le seuil de proximité lexicale utilisé pour la revue manuelle. Ce seuil sert à attirer l'attention : il ne constitue pas une preuve de doublon.

| Carte V2 | Carte existante la plus proche | Décision éditoriale |
|---|---|---|
| int-002 — souvenir du premier amour | b11 — souvenir partagé | Sujet distinct : l'histoire du premier amour, pas un souvenir commun entre les joueurs. |
| int-013 — attirance par la voix | d13 — premier détail remarqué | Sujet distinct : l'effet de la voix avant même de voir la personne. |
| int-018 — baiser sans amour | p04 — juste après un moment intime | Sujet distinct : rapport entre baiser et sentiments, pas besoins après l'intimité. |
| int-019 — parler de masturbation | f22 — tabou sexuel | Sujet plus précis : masturbation explicitement, plutôt qu'un tabou sexuel indéfini. À surveiller pour éviter de multiplier les questions génériques sur les tabous. |
| int-025 — fréquence de masturbation | aucune carte équivalente | Sujet distinct : fréquence et facteurs qui influencent cette pratique. |
| int-037 — expérience sexuelle audacieuse | g20 — limite sexuelle supposée | Sujet distinct : récit d'une expérience passée, pas deviner une limite du partenaire. |

Aucun doublon textuel exact n'a été détecté. Après revue des six proximités, aucune n'est un doublon sémantique direct. Cela reste une validation éditoriale de brouillon, pas une certification définitive de chaque carte.

## 3. Équilibre du lot

| Intensité éditoriale | Nombre | Axe principal |
|---|---:|---|
| 1 — Doux | 8 | premier amour, statut, souvenirs, personnalité |
| 2 — Taquin | 8 | ex, jalousie, crush, attirance et signaux |
| 3 — Chaud | 8 | expériences sentimentales, baisers, masturbation et confidences sexuelles |
| 4 — Très chaud | 8 | masturbation, porno, positions, sexe oral, initiatives et jeux de rôle |
| 5 — Extrême | 8 | sexualité à plusieurs, fantasmes d'exhibition, accessoires, simulation de plaisir et confessions franches |
| **Total** | **40** | |

## 4. Points à revoir avant intégration

- Certaines questions d'intensité 5 sont provocatrices mais ne doivent pas être classées « extrêmes » uniquement pour leur vocabulaire. La progression doit être validée à la lecture, carte par carte.
- Les questions sur la pornographie, la masturbation, les pratiques sexuelles et les expériences passées doivent rester destinées aux adultes.
- Les scénarios restent fictifs ; aucune carte ne doit laisser croire qu'une situation doit être réalisée.
- Les questions sur les expériences passées doivent fonctionner même si le joueur n'a pas vécu l'expérience : prévoir une réponse « jamais / pas envie d'en parler » dans l'UX, sans transformer chaque prompt en avertissement.
- Le champ `intensity` reste éditorial et séparé du champ technique `level` 1–4.

## 5. Statut

**V2 : brouillon à relire, non intégré.** Les 192 cartes actives restent inchangées. Aucune migration Supabase, aucun changement applicatif et aucun déploiement n'ont été effectués.

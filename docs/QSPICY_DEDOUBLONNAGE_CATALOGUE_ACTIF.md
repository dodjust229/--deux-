# QSPICY — audit des répétitions internes du catalogue actif

Date : 24 novembre 2026  
Base : `src/catalog.json`, 192 cartes.  
Méthode : comparaison lexicale de toutes les paires, puis revue éditoriale des intentions des rapprochements les plus forts. Les scores servent à repérer les cartes à relire ; ils ne suffisent pas à décider seuls qu'il s'agit d'un doublon.

## 1. Constat

Le contrôle des textes strictement identiques ne détecte aucun doublon, mais la comparaison des intentions fait ressortir plusieurs groupes de cartes trop proches. Le catalogue actif contient donc des répétitions de mécanique et d'angle, notamment autour des rendez-vous, des compliments, des signaux de désir, des aveux sexuels et des scénarios.

Aucune modification n'a été faite dans `src/catalog.json`.

## 2. Groupes prioritaires à dédoublonner

| Groupe de cartes | Proximité observée | Recommandation |
|---|---|---|
| e05 / f11 | Raconter un moment où le désir pour l'autre était évident ou presque insoutenable, puis demander à l'autre s'il l'avait senti. | Garder f11, plus intense et plus précis ; retirer ou réécrire e05 sur un angle différent. |
| d12 / b02 | Choisir en secret le rendez-vous qui ferait le plus plaisir. | Garder une seule carte ; transformer l'autre en choix d'activité concret ou la retirer. |
| d11 / d17 | Choix du moment de la journée pour le désir ou pour passer du temps ensemble. | Garder d11 si l'objectif est le désir ; réécrire d17 vers un autre thème personnel. |
| c13 / b04 | Faire un compliment sur une qualité ou un détail que l'autre ne remarque pas. | Garder une seule version ; b04 est plus simple et plus directe. |
| a23 / e10 | Dire précisément ce qui attire physiquement chez l'autre. | Garder a23 pour le palier très chaud ; réécrire e10 pour un autre angle de séduction. |
| a24 / g16 | Décrire une envie sexuelle et les conditions qui permettent de l'explorer librement. | Fusionner les deux en une carte plus concrète ; éviter de répéter les mêmes conditions de sécurité. |
| a27 / g10 | Formuler une demande sexuelle précise en laissant une réponse libre. | Garder une seule version ; g10 est plus claire sur la formulation de la demande. |
| c04 / c09 / e03 | Deviner qui fera le premier pas ou craquera le premier dans la séduction. | Garder deux mécaniques vraiment distinctes au maximum ; réécrire c09 ou e03 pour sortir du « qui fera le premier pas ». |
| s08 / e01 | Deviner le signe qui révèle le désir de l'autre. | Garder s08, plus imagé et précis ; réécrire e01 ou le retirer. |
| d03 / c06 / c14 / b24 | Choix d'une soirée, d'une ambiance ou d'un rendez-vous idéal. | Réduire à deux cartes maximum, avec des angles distincts (activité concrète vs ambiance). |
| e05 / f05 / f11 | Récit d'un moment passé où l'attirance ou l'excitation était forte, puis réaction de l'autre. | Garder f05 pour la scène vécue et f11 pour le désir ressenti ; supprimer e05 ou le réorienter. |
| e19 / f14 | Deviner quel geste de l'autre déclenche une réaction immédiate ou fait perdre le fil. | Garder la formulation la plus forte ; différencier l'autre sur une zone ou une situation précise. |
| s03 / a29 | Choisir l'ambiance qui fait basculer ou donne envie de se laisser faire. | Garder une carte d'ambiance ; remplacer l'autre par une question de séduction concrète. |
| f23 / g02 | Choisir en secret un scénario qui attire, sans obligation de le réaliser. | Garder g02 si le scénario est sexuel ; réécrire f23 en scénario de séduction non sexuel. |
| f07 / g23 | Choisir un sujet sexuel cru à aborder. | Garder une seule carte de choix de sujet ; transformer l'autre en question précise plutôt qu'en sélection de thème. |
| e07 / g07 | Choisir en secret un défi de séduction ou un défi adulte. | Distinguer clairement le défi léger du défi sexuel, ou retirer une carte. |
| a25 / f02 | Choisir en secret une audace qui tente les deux joueurs. | Garder une seule carte ; l'autre doit proposer une interaction précise plutôt qu'un choix vague. |
| f07 / f22 | Choisir un sujet sexuel à aborder ou nommer le tabou impossible à aborder. | Garder f22, qui déclenche une vraie conversation ; réécrire f07 en question spécifique. |
| d19 / b11 | Raconter un souvenir de l'histoire commune et laisser l'autre compléter. | Fusionner en une seule carte de souvenir partagé. |
| x01 / b11 | Raconter un souvenir commun et comparer les versions. | Conserver x01 pour un souvenir sensuel ; fusionner b11 avec d19 pour le souvenir général. |

## 3. Proximités qui ne sont pas forcément des doublons

Certaines cartes partagent un thème mais déclenchent une interaction différente. Elles peuvent être conservées si leur différence est claire :
- x01 (souvenir sensuel partagé) et b11 (souvenir général) ;
- c09 (initiative quand le désir monte) et c10 (montrer, attendre ou provoquer) ;
- f13 (rythme d'un moment intime) et g13 (dynamique/jeu de rôles) ;
- e21 (vérité personnelle) et g21 (insatisfaction sexuelle) ;
- x02 (détail troublant) et e11 (taquinerie appréciée) ;
- b07 (plaisir simple partagé) et b13 (rituel de couple).

## 4. Formulations dépendantes du temps réel

Le catalogue contient plusieurs formulations comme « ce soir », « maintenant », « cette semaine » ou « demain ». Elles ne doivent pas être interprétées comme si l'application connaissait l'heure ou le contexte réel du joueur.

À réécrire en scénarios intemporels ou hypothétiques, notamment : d05, b02, b07, e19, s05, s08, a03, a06, a08, a10, a13, a14, a18, a20, a22, a29, f02, f13, f23, g04, g07, g23. Cette liste est un repérage initial à vérifier sur le catalogue complet, pas une liste exhaustive garantie.

## 5. Décision avant le catalogue maître

1. Ne pas ajouter les 40 propositions V2 au catalogue actif immédiatement.
2. Traiter les groupes prioritaires ci-dessus dans une matrice carte par carte : conserver, fusionner, réécrire, retirer ou déplacer d'intensité.
3. Préserver les identifiants des cartes conservées.
4. Garder `level` 1–4 intact pour les fonctions techniques et créer une intensité éditoriale distincte uniquement après validation de la structure.
5. Produire ensuite un catalogue maître de travail, puis effectuer les contrôles JSON, synchronisation, tests et revue humaine.

## 6. Périmètre

Audit documentaire uniquement. Le catalogue actif, le code applicatif, Supabase et le déploiement n'ont pas été modifiés.

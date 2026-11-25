# QSPICY — recette de régression Zone 2

Date : 25 novembre 2026

## Périmètre

Zone 2 concerne le défaut observé dans un salon simple : les deux joueurs choisissaient
la préférence **Audacieux**, mais la partie ne servait pas de contenu correspondant.

Le périmètre couvre aussi la progression du palier de session : l'indicateur ne doit jamais
redescendre lorsque le paquet contient une carte d'un palier inférieur.

Ce travail est distinct de la réécriture du catalogue, de l'invitation et des corrections
graphiques mobile/logo.

## Correctifs déjà présents dans le dépôt

La migration `supabase/20_level_and_mode_integrity.sql` apporte les règles métier :

1. `rooms.current_level` conserve le palier de session.
2. Le trigger `trg_rooms_current_level` empêche toute régression pendant la progression.
3. `_effective_level` relève le palier demandé jusqu'au premier palier supérieur qui contient
   des cartes pour les catégories choisies. La catégorie `audacieux`, disponible aux paliers
   3 et 4, peut donc démarrer depuis une préférence de palier 1 ou 2.
4. Si `audacieux` fait partie de l'union des choix, le palier effectif monte au minimum à 3, même si l'autre joueur a choisi une catégorie disponible plus tôt.
5. Le paquet réserve jusqu'à 8 cartes Audacieux avant de le compléter avec les autres cartes du même palier, afin que le choix ne disparaisse pas dans le tirage aléatoire.
6. Le snapshot expose le palier de session au client.
7. Le composant de jeu privilégie `room.level` au niveau technique de la carte courante.

La recette SQL `supabase/tests/level_and_mode_integrity.sql` couvre déjà le palier non
décroissant, le lancement Audacieux et la conservation de l'accord 18+ lors d'une relance.
Elle est exécutée par `supabase/tests/run_postgres.sh`.

## Complément ajouté dans cette livraison

- Aperçu de développement `?apercu=zone2-lobby` pour reproduire le salon simple avec deux
  joueurs présents et leurs accords 18+.
- Aperçu `?apercu=zone2-level-regression` pour afficher une carte de palier 3 dans une session
  dont le palier persistant est 4.
- Recette navigateur Playwright :
  - les deux choix Audacieux sont réunis ;
  - un lancement demandé au palier 2 appelle le serveur avec la catégorie Audacieux ;
  - le serveur renvoie le premier palier disponible (3) et la carte correspondante s'affiche ;
  - un cas mixte Audacieux + Séduction relève aussi le palier 2 vers 3 et garantit au moins 8 cartes Audacieux dans le paquet ;
  - l'interface conserve le palier de session 4 même si la carte courante est de palier 3.
- La CI installe Chromium et exécute ces deux scénarios.

Les appels Supabase de la recette navigateur sont simulés : aucun accès à la base de production
n'est nécessaire. La logique SQL réelle reste couverte par la recette PostgreSQL 16.

## Critère éditorial à conserver

Les questions doivent s'adresser directement aux joueurs avec un ton intime et privé.
Ce critère est conservé pour le contrôle éditorial du catalogue ; cette livraison ne réécrit
ni ne remplace les cartes.

## Limites de cette livraison

- Aucun changement de base Supabase de production.
- Aucun déploiement Render ou GitHub Pages.
- Aucune fusion dans `main`.
- La validation finale des scénarios navigateur dépend du résultat CI de cette branche.


## Intégration avec le catalogue maître V2

La recette de régression du parcours doit également passer lorsque cette branche est évaluée avec le catalogue maître V2 (220 cartes) : les catégories affichées dépendent du choix Douce / Audacieux / Toutes, tandis que l'intensité éditoriale 1–5 reste distincte du palier technique interne 1–4. Aucun sélecteur de palier technique ne doit réapparaître dans les préférences joueur.

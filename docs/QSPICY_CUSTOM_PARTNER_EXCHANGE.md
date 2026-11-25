# QSPICY — échanges privés dans Personnalisé

## Règle produit

Personnalisé ne demande pas aux joueurs de rédiger les questions. QSPICY tire 5 à 24 cartes
existantes du catalogue selon les catégories communes. Le mode sert à approfondir le jeu à
deux et à prolonger l'échange après chaque révélation.

## Interface

- La sélection reste un choix de parcours dans le catalogue.
- Après chaque révélation, un espace privé permet d'écrire un commentaire ou d'envoyer une
  réaction rapide (❤️ 😏 🔥 👏 😂).
- Les messages sont visibles uniquement aux deux joueurs de la salle.
- Le panneau n'apparaît pas avant la révélation, afin de ne pas contourner les réponses cachées.
- Le guide explique le fonctionnement réel et ne promet plus la rédaction de questions libres.

## Sécurité et persistance

- Les messages sont stockés dans `duo_messages`, espace `partner`.
- L'accès passe par RPC avec le jeton de joueur ; aucun accès direct à la table n'est accordé.
- Seules les salles `mode='couple'` et `room_kind='custom'` sont acceptées.
- La salle doit être active et contenir exactement deux joueurs.
- Messages texte de 1 à 2 000 caractères ; 40 envois par minute et par joueur.
- Le snapshot expose les messages aux deux participants de la salle.
- Les salons À Deux standard et DUOS conservent leurs règles existantes.

## Vérification

La recette PostgreSQL 16 vérifie l'envoi, la lecture par les deux partenaires, la conservation
des options QCM dans le snapshot, le rejet des messages vides et l'interdiction d'utiliser la
messagerie dans le salon À Deux standard.

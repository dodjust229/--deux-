# QSPICY — master tracker

Dernière mise à jour : 24 novembre 2026  
Dépôt : https://github.com/dodjust229/--deux-  
Application : https://a-deux-jeu.onrender.com  
Branche principale : `main`

## Règle de reprise — éviter les audits en boucle

Avant tout nouveau travail :
1. Lire ce tracker et le dossier de reprise du palier concerné.
2. Vérifier les PR déjà fusionnées, les branches ouvertes et le commit actuellement déployé.
3. Reprendre uniquement les éléments explicitement marqués « restant ».
4. Ne pas refaire un audit général déjà documenté, sauf si un nouveau changement le rend nécessaire.
5. Ne jamais déclarer une livraison terminée sans CI, vérification du déploiement et recette adaptée.

L'utilisateur ne peut pas joindre de fichiers dans cette conversation. Travailler depuis GitHub, Supabase et Render ; ne pas redemander de fichiers.

## Avancement des paliers

| Palier | Sujet | État | Référence / restant |
|---|---|---|---|
| 1 | Cœur du jeu, niveaux, consentement 18+ | Livré | Main ; CI et Render validés. |
| 2 | Historique des questions et anti-répétition | Livré | `docs/QSPICY_PALIER_2_REPRISE_IA.md` ; migration 14 et catalogue étendu. |
| 3 | Mode Personnalisé | Livré | `docs/QSPICY_PALIER_3_REPRISE_IA.md` ; moteur de catalogue et garde-fous serveur déployés. |
| 4 | Invitations, rôles, intérêts individuels | Livré côté code | `docs/QSPICY_PALIER_4_REPRISE_IA.md` ; PR #20 fusionnée, migration 17 appliquée, Render live. Tests réels à 2/4 appareils encore à faire. |
| 5 | Confidentialité et photos personnelles depuis la galerie | Livré côté code et infrastructure | `docs/QSPICY_PALIER_5_REPRISE_IA.md` ; PR #21, #22, #23 fusionnées ; migration 18 et Edge Function déployées ; Render live. Recette photo multi-appareils restante. |
| 6 | Musique et ambiance | Livré code et déployé | PR #24 fusionnée ; CI #45372319685 réussie ; Render `dep-dc2m65ss728c73b0u7c0` live. Recette audio réelle mobile/desktop restante. |
| 7 | Tests globaux, bugs et stabilisation | Livré code et déployé | PR #25 fusionnée ; CI #45374406093 réussie, dont recette PostgreSQL 16 ; Render `dep-dc2mc1m7bikc7394161g` live. Recette terrain à deux/quatre appareils encore nécessaire. Voir `docs/QSPICY_PALIER_7_REPRISE_IA.md`. |

## Palier 7 — stabilisation finale
- Correctif de course réseau : les réponses tardives d'une ancienne salle ne peuvent plus écraser la session courante ; isolation par salle/jeton/mode.
- Nouvelle recette PostgreSQL Palier 7 : accès directs, privilèges RPC, jetons, hôte, confidentialité des réponses DUOS et retrait du consentement croisé.
- PR #25 fusionnée ; CI #45374406093 : TypeScript, tests, build et PostgreSQL 16 réussis, y compris `PALIER 7 SECURITY REGRESSION OK`.
- Render `dep-dc2mc1m7bikc7394161g` live sur commit `e8617dda400578ea7b282bc0f0b7e2107a886e5d`.
- Reste la recette terrain sur deux/quatre appareils et les vérifications réelles photo/audio des paliers 5–6.
- Voir `docs/QSPICY_PALIER_7_REPRISE_IA.md`.

## Éléments encore ouverts

### Palier 6 — recette audio après déploiement
- Code et infrastructure livrés ; PR #24 fusionnée et Render live.
- CI GitHub Actions run `45372319685` : TypeScript, tests unitaires/catalogue, build et intégration PostgreSQL 16 réussis.
- Reste la recette réelle : Lounge, Velours et Pluie sur mobile/ordinateur ; volume, arrêt, sortie, fin de partie et absence d'autoplay après rechargement.
- Voir `docs/QSPICY_PALIER_6_REPRISE_IA.md`.

### Priorité immédiate — recette Palier 5
- Tester l'envoi d'une vraie photo depuis la galerie sur deux appareils.
- Vérifier Couple, DUOS privé et espace commun à quatre.
- Vérifier retrait/réactivation du consentement, suppression et nettoyage.
- Voir `docs/QSPICY_PALIER_5_REPRISE_IA.md` pour les scénarios précis.

### Palier 4 — recette terrain
- Tester invitation et arrivée d'un invité sur un second appareil.
- Tester les quatre sièges DUOS et les intérêts individuels.
- Vérifier que seul l'hôte peut lancer la partie.

### VIP1 / Host Pass — chantier séparé non terminé
- Backend FedaPay et tables de paiement/abonnement déjà présents.
- Intégration Auth côté client absente à ce stade.
- UI de connexion téléphone + e-mail, vérification et paiement 750 FCFA / 15 jours à intégrer.
- Gating de création de salle à appliquer sans casser les RPC de jeu réservées à `anon`.
- Ne pas déclarer VIP1 terminé.

## État de livraison connu

- PR #21 — nettoyage des confidences locales : fusionnée.
- PR #22 — nettoyage centralisé lors de la fermeture de session : fusionnée.
- PR #23 — partage privé de photos depuis la galerie : fusionnée.
- Dernier commit applicatif Render live (Palier 7) : `e8617dda400578ea7b282bc0f0b7e2107a886e5d`.
- Déploiement Render Palier 7 : `dep-dc2mc1m7bikc7394161g`, statut live.
- Livraison précédente Palier 6 : commit `a0fba2bdcc77c60e4d72fd907a0d9c7f15811ed4`, déploiement `dep-dc2m65ss728c73b0u7c0`.
- Livraison précédente Palier 5 : commit `6bdfb67a522e1a0c8b625d3ddf9d3a8102cefb42`, déploiement `dep-dc2m1ee8bjmc738425s0`.
- Migration Supabase 18 : appliquée.
- Edge Function `qspicy-room-media` : ACTIVE, version 1.
- Bucket `qspicy-private-media` : privé, JPEG uniquement, 5 Mo maximum.
- Le dossier Palier 5 précise les limites de nettoyage après fermeture brutale de tous les navigateurs.

## Conventions techniques

- GitHub : `dodjust229/--deux-`, branche `main`.
- Supabase : projet `xqvxorvvjmwzpcqmqnqv`.
- Render : service `srv-dc1o8kt9fdbs73bd8qb0`.
- Les migrations numérotées sont conservées dans `supabase/` et les recettes PostgreSQL dans `supabase/tests/`.
- Les fonctions de jeu utilisent des jetons de joueur ; ne pas basculer globalement le client de jeu sur Auth sans analyse des grants existants.
- Les secrets de service ne doivent jamais être ajoutés au frontend ni aux fichiers du dépôt.
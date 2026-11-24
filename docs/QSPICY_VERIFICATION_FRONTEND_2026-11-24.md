# Vérification frontend et Render — 24 novembre 2026

Branche : `qspicy/frontend-verification-2026-11-24`, créée depuis `origin/main` `3f14afe`.
Aucune écriture en production, aucun déploiement, aucune migration appliquée.

## Environnement constaté

| Élément | Valeur vérifiée |
|---|---|
| `origin/main` | `3f14afe` — « Docs QSPICY: statut production du palier 7 » |
| Migrations SQL du dépôt | 24 fichiers sous `supabase/` |
| Application en ligne | `https://a-deux-jeu.onrender.com` — HTTP 200 |
| Bundle servi | `assets/index-CuVb0taX.js` (641 999 octets) |
| Bundle construit depuis `main` | `assets/index-BLaSIPYG.js` |
| Bundle construit depuis `e8617dd` | `assets/index-BLaSIPYG.js` (identique à `main`) |

Les deux commits entre `e8617dd` et `main` portent `[skip render]` : ils n'ont pas déclenché de
reconstruction, ce qui explique qu'ils n'apparaissent pas dans le bundle. La différence de nom
entre le bundle servi et celui reconstruit localement n'est **pas** interprétée comme une dérive :
la comparaison décisive reste l'identifiant du déploiement Render actif face au SHA déployé.

## Ce qui fonctionne réellement en production

- Chargement sans erreur console à 360, 430 et 1280 px ; débordement horizontal mesuré à **0 px**
  sur l'accueil et sur le choix du salon.
- Deux navigateurs distincts rejoignent la même salle : l'invité voit « INVITÉ DE LA SALLE »,
  les deux prénoms et les centres d'intérêt. Le code des paliers 3 et 4 est donc bien servi.
- Modes proposés : À Deux (actif), DUOS (actif), Personnalisé (actif), Côte à Côte et Anonyme
  verrouillés avec la mention « Bientôt ».

## Limite de la recette automatisée

Le harnais à deux navigateurs (`/tmp/e2e/run.mjs`, hors dépôt) a été écrit pour l'interface de la
branche `qspicy/guide-et-salons-finalisation`, antérieure au palier 4. Il s'arrête sur la
production au sélecteur `[data-testid="invite-url"]`, absent de l'interface actuelle : c'est le
harnais qui est en retard, pas l'application. Il doit être rebasé sur les repères de `main`
(centres d'intérêt) avant toute nouvelle conclusion.

## Reste à faire (frontend)

1. Rebaser le harnais sur `main`, puis rejouer le parcours à deux et à quatre en production.
2. Lire l'identifiant du déploiement Render actif et le confronter au SHA `e8617dd`.
3. Recette réellement multi-appareils des paliers 4 à 7 (invitation, intérêts, photos, audio) :
   elle exige des appareils physiques, seule une partie est automatisable.

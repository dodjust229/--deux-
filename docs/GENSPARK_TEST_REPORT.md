# QSPICY — rapport de tests

> Branche `genspark/qspicy-refonte` — 23 novembre 2026.
> Tous les résultats ci-dessous proviennent d'exécutions réelles, pas d'une lecture de code.

## 1. Environnement utilisé

| Élément | Valeur |
|---|---|
| Node.js | 22.23.3 (npm 10.9.9) |
| Navigateur des tests | Google Chrome (headless) piloté par puppeteer-core |
| Serveur | `npm run dev` sur `http://127.0.0.1:5180` |
| Backend | projet Supabase `xqvxorvvjmwzpcqmqnqv` (clé `publishable`, aucune écriture de schéma) |
| Appareils simulés | 1440×1000, 390×844, 360×800 |
| Scénario deux joueurs | deux contextes navigateur isolés (stockage local distinct), 1 salle jetable par exécution |

Les salles de test sont des salles normales de l'application, supprimées automatiquement par
`_purge()` après 6 h d'inactivité. Aucune table, fonction ou politique n'a été modifiée.

## 2. Tests automatisés (`npm test`)

`node --test` + vérification du catalogue : **21 tests, 21 réussis**.

| Fichier | Ce qui est vérifié |
|---|---|
| `src/lib/protocol.test.ts` (5) | erreurs fatales/transitoires, prédiction, extraction d'identifiant, alternance, intersection des catégories |
| `src/lib/media.test.ts` (5) | encodage/décodage sticker, sticker inconnu, URL GIF (https uniquement, `javascript:` refusé), compatibilité du texte existant, borne 2000 caractères |
| `src/lib/prefs.test.ts` (4) | valeurs par défaut, reprise de l'ancien réglage de réduction, JSON corrompu, indépendance entre deux appareils |
| `src/lib/scene.test.ts` (7) | bulle portée par le bon personnage, jamais deux prises de parole, révélation, attente, question croisée, pause/fin, extrait de bulle |
| catalogue | `supabase/02_catalog.sql` synchronisé avec `src/catalog.json` (43 interactions) |

Compilation : `npm run build` réussit (TypeScript `strict` + build Vite), sortie
`dist/assets/index-*.js` ≈ 516 kB (149 kB gzip), `index-*.css` ≈ 31 kB (7 kB gzip).

## 3. Scénario de bout en bout, deux joueurs réels

Exécuté avec deux contextes Chrome isolés contre le backend Supabase : **21 vérifications,
21 réussies**.

- T01 création de salle et lien d'invitation ;
- T02 jonction par le lien, identifiant prérempli, les deux joueurs dans la même salle ;
- consentement 18+ : lancement bloqué avec un seul accord, débloqué avec les deux ;
- T03 démarrage simultané ;
- réponses masquées puis révélation simultanée ;
- T06/T07 double validation (progression 1/24 → 2/24 une seule fois) ;
- T10 rechargement de page : même salle, même question ;
- T11 sticker reçu et affiché comme média (comptage DOM : 1 sticker) ;
- T12 GIF animé chargé et rendu (`is-ready`) ; un GIF muet bascule en fallback après 8 s ;
- T13 thème clair sur l'appareil A, l'appareil B reste sombre ;
- T14 réduction des animations appliquée sans masquer le contenu ;
- T15 aucun débordement horizontal en 360 px (0 px mesuré) ;
- T08 question passée : mention « A choisi de passer, sans justification » côté partenaire ;
- T09 départ de l'autre joueur : le partenaire voit la place libre (« Personne 2 · en attente ») ;
- T16 coupure réseau simulée : bandeau « Reconnexion… », reprise sans perte.

## 4. Tableau des tests obligatoires du cahier des charges

| ID | Scénario | Résultat | Preuve |
|---|---|---|---|
| T01 | Un joueur crée une salle | **Réussi** | lien `?room=<uuid>` fourni, salle créée |
| T02 | Le second joueur rejoint | **Réussi** | deux pseudos dans la même salle, sans rechargement |
| T03 | Les deux joueurs démarrent | **Réussi** | question 1/24 affichée des deux côtés |
| T04 | Un joueur répond | **Réussi** | réponse enregistrée, message « en attente de l'autre » |
| T05 | Révélation des réponses | **Réussi** | les deux réponses apparaissent en même temps |
| T06 | Un seul joueur valide la suite | **Réussi** | la partie reste sur la même question |
| T07 | Le second joueur valide | **Réussi** | progression unique 1/24 → 2/24 |
| T08 | Un joueur passe une question | **Réussi** | « A choisi de passer, sans justification » |
| T09 | Un joueur quitte | **Réussi** | place libre + état « en attente » côté partenaire |
| T10 | Rechargement d'une page | **Réussi** | même salle, même question après `reload` |
| T11 | Sticker statique | **Réussi** | rendu média, libellé « Clin d'œil », jamais le code brut |
| T12 | GIF animé | **Réussi** | image chargée ; fallback explicite si le lien ne répond pas |
| T13 | Thème modifié sur l'appareil A | **Réussi** | A = clair, B = sombre |
| T14 | Réduction des animations | **Réussi** | `data-motion="reduced"`, contenu et boutons intacts |
| T15 | Mobile 360 px | **Réussi** | `scrollWidth - clientWidth = 0` |
| T16 | Déconnexion réseau | **Réussi** | bandeau de reconnexion, retour sans perte |
| T17 | Build de production | **Réussi** | `tsc -b && vite build` sans erreur |

## 5. Vérifications visuelles

Captures réalisées en 1440×1000 et 390×844, thèmes sombre et clair : accueil, salle d'attente,
partie, révélation, fin de partie, réglages. Points contrôlés :

- bulle dans une zone réservée, tail pointant vers le personnage qui parle ;
- aucun personnage au-dessus d'un texte, d'un bouton ou d'une zone interactive ;
- libellés lisibles en 390 px, boutons ≥ 44 px ;
- thème clair : contrastes conservés, bulles sombres volontairement contrastées ;
- réglages accessibles au clavier (Échap ferme la feuille, focus initial sur « Fermer »).

## 6. Ce qui n'a pas été testé

| Élément | Raison |
|---|---|
| Safari iOS et Firefox | environnement Linux, seul Chrome disponible ici |
| Deux appareils physiques distincts | remplacé par deux contextes isolés sur le même poste |
| Lecteur d'écran (NVDA/VoiceOver) | non disponible ; structure ARIA posée mais non auditée |
| Réseau lent (3G, perte de paquets) | seule la coupure totale a été simulée |
| Mode 18+ de bout en bout sur du contenu 18+ | le consentement a été testé, puis retiré avant de lancer la partie |
| Paiement, déploiement Render | hors périmètre (aucun déploiement autorisé) |

## 7. Bugs restants ou limites connues

1. **Pas de type « réaction » séparé** : le schéma existant n'a pas de table de messages.
   Les stickers couvrent l'expression ; une vraie messagerie demanderait une migration.
2. **Le GIF dépend d'un hébergeur externe** : si le lien meurt, le fallback s'affiche (comportement voulu).
3. **Bundle d'environ 516 kB** : dû à `@supabase/supabase-js`. Un découpage manuel
   (`manualChunks`) réduirait le chunk initial, non nécessaire pour une application à deux.
4. **Personnages vectoriels** : cohérents et animés, mais ils restent une illustration
   stylisée ; le propriétaire peut fournir des planches définitives sans changer le code
   (les états sont des classes CSS).
5. **Aucun son fourni** : les sons sont générés localement (WebAudio), désactivés par défaut.
6. **Polling de 2,2 s** : conservation volontaire du mécanisme existant ; Supabase Realtime
   serait une évolution, pas une correction.

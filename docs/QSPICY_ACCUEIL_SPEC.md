# QSPICY — Composition de l'accueil et plan d'assets

**Implémenté** sur la branche `qspicy/accueil-plein-cadre` le 2026-11-23 : composition A retenue,
master produit, trois recadrages tirés, `Home.tsx` et `screens.css` refaits.
Fichiers : `public/brand/accueil-{bureau,tablette,mobile}.webp`, `src/screens/Home.tsx`,
`src/styles/screens.css` (§ Accueil), `src/styles/base.css` (`.topbar--over`).
Vérifié : `npm test` 21/21, `npm run build`, rendu contrôlé en 1271 px et en 390 px (cadre iframe).
Identité conservée : bordeaux profond, noir cerise, or vieilli, ivoire, rouge piment en accent, ambiance
cinématographique sombre. L'esthétique de l'image passe au manga adulte / roman graphique.

---

## 1. Décision de composition

Deux compositions possibles. La première est retenue.

**A. Plein cadre cinématographique (retenue).** L'image devient le fond de la section d'accueil, sur toute
la largeur, sans carte ni coin arrondi. La copie (accroche, bouton Entrer, lien d'invitation) est posée
en bas à gauche sur un voile sombre. C'est la seule composition qui donne l'effet d'entrée immédiat
demandé, et la seule qui utilise l'image comme le brief le prévoit : un décor, pas une vignette.

**B. Carte éditoriale (écartée).** La composition actuelle — copie à gauche, visuel de 460 px encadré à
droite — resterait en place avec une nouvelle image. Plus prudent, mais l'image y reste une illustration
posée à côté du texte, et le « waouh » d'ouverture n'a pas lieu. Elle garde un intérêt comme repli si le
plein cadre échoue aux tests de lisibilité.

### Trame (bureau ≥ 900 px)

```
┌──────────────────────────────────────────────────────────────┐
│  [logo 38px]                              Partie privée  ⚙   │  barre haute, filet or
│                                                              │
│                                                              │
│      JEU DE CONVERSATION · 18 ANS ET PLUS                    │
│      Ici, tu n'as plus besoin                                 │
│      de faire semblant.                                      │
│      Deux personnes, une conversation qui ose…               │
│                                                              │
│      [ Entrer → ]                                            │
│      J'ai un lien d'invitation                               │
│      🛡 Gratuit · Sans compte · Chacun peut passer ou s'arrêter│
└──────────────────────────────────────────────────────────────┘
   ↑ voile bordeaux→transparent à gauche, 0–55 % de la largeur
```

### Trame (mobile < 700 px)

```
┌──────────────────────┐
│ [logo]     ⚙  privée │  scrim haut 0→22 %
│                      │
│                      │  zone image : bustes, visages
│                      │  dans la moitié haute
│                      │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁  │  voile montant 45→100 %
│ JEU DE CONVERSATION  │
│ Ici, tu n'as plus    │
│ besoin de faire      │
│ semblant.            │
│ Deux personnes…      │
│ [ Entrer → ]         │
│ J'ai un lien…        │
│ 🛡 18+ · sans compte │
└──────────────────────┘
```

---

## 2. Positionnement de l'image

- Couvre exactement la section d'accueil : `width: 100vw` en sortant du conteneur de 1180 px, hauteur
  `100dvh` sur mobile et `clamp(620px, 84vh, 860px)` sur bureau, sans arrondi.
- `object-fit: cover`.
- Point d'ancrage : `object-position: 72% center` sur bureau (le couple occupe la droite, le vide
  charbon la gauche sous le texte) ; `center 22%` sur mobile (les visages restent dans la moitié haute).
- Sous la barre haute : aucun visage ni détail important dans les 12 % supérieurs, pour que le logo et
  la navigation restent lisibles.
- Ordre des couches : image (z 0) → voile dégradé (z 1) → copie et barre haute (z 2).

## 3. Rôle dans la composition

L'image porte trois choses, et rien d'autre :

1. **L'univers** : un intérieur sombre, chaleureux, légèrement mystérieux — pas un décor de rencontre.
2. **Les deux personnages** : un homme et une femme adultes, regards et proximité qui racontent une
   tension ; ils incarnent le jeu, pas un couple installé.
3. **La profondeur** : un avant-plan sombre et un arrière-plan lisible permettent de poser le texte
   sans masquer les visages.

Elle ne porte jamais : texte, logo, bouton, menu, filigrane, élément d'interface, symbole de
consentement. Ces éléments vivent dans le code.

## 4. Format, dimensions, poids

| Version | Dimensions | Usage | Poids cible | Format |
|---|---:|---|---:|---|
| Master | 1600 × 2000 (4:5) | source unique, conservée hors du dépôt | — | PNG de travail |
| Bureau | 1600 × 900 (16:9) | accueil ≥ 900 px | ≤ 260 kB | WebP q. 80 |
| Tablette | 1280 × 960 (4:3) | 700–899 px | ≤ 200 kB | WebP q. 80 |
| Mobile | 1080 × 1440 (3:4) | < 700 px | ≤ 180 kB | WebP q. 78 |

Règles de cadrage du master, pour que les trois recadrages tiennent :

- les deux visages dans la bande verticale **30–55 %** de la hauteur du master ;
- le couple dans les **55 % droits** de la largeur ;
- la partie gauche (0–45 %) volontairement calme et sombre : c'est la zone de texte sur bureau ;
- aucun élément coupé aux bords qui ne le serait pas dans les trois formats.

Servi en `<picture>` avec `srcset`/`sizes`, `fetchpriority="high"`, dimensions intrinsèques déclarées
pour éviter tout saut de mise en page (l'image est le LCP de l'accueil).

## 5. Articulation avec le logo et la navigation

- **Logo** : inchangé, `public/brand/logo-qspicy.webp`, affiché à 38 px en haut à gauche, sur le voile
  haut. Aucun logo dans l'image. Une dérivée 128 px (≤ 20 kB) reste à valider pour alléger le chargement.
- **Navigation** : « Partie privée » et les réglages restent en haut à droite, sur un scrim de 0 à 22 %
  qui garantit le contraste. Rien ne passe par-dessus l'image sans voile.
- **Bouton Entrer** : pleine largeur sur mobile, largeur automatique sur bureau ; or vieilli sur bordeaux,
  jamais posé directement sur une zone claire de l'image.
- **Lien d'invitation** : sous le bouton, en texte or, sur le voile.
- **Mentions** : 18+, sans compte, droit de passer ou de s'arrêter, en bas de la copie, taille 13 px.
- **Légende actuelle** (« Un espace privé, pour deux. ») : conservée, mais déplacée en sur-titre discret
  au-dessus de l'accroche, et non plus posée sur l'image.

## 6. Cohérence avec l'identité

- Palette de l'image : noir cerise et brun très sombre en fond, bordeaux profond en lumière rasante, or
  vieilli sur les reflets, ivoire sur les carnations. Le rouge piment reste un accent (un détail : lèvres,
  tissu, verre), **jamais une dominante** — c'est la correction demandée.
- Lumière : une source chaude latérale, ombres profondes, contraste cinématographique ; pas de néon, pas
  de halo rouge.
- Style : trait encré, hachures et aplats travaillés, visages expressifs et reconnaissables, rendu de
  roman graphique adulte ; ni photo, ni peinture numérique lissée, ni cartoon.
- Le voile de texte emploie les mêmes valeurs que le reste du site (bordeaux vers transparent), pour que
  l'image et l'interface ne fassent qu'un.
- Thème clair : la section d'accueil reste sombre dans les deux thèmes — c'est la signature du produit ;
  seul le reste de l'application suit le thème.

## 7. Ce que la production coûtera

- **Un seul rendu** : le master. Les trois recadrages sont des dérivés techniques, pas trois images.
- Deux essais maximum avant arbitrage ; aucune série, aucun lot d'images.
- Validation : Claude sur le rendu et le cadrage, Justice sur l'image finale, puis intégration.

## 8. Ce que cela changera dans le code (à faire après validation)

`src/screens/Home.tsx` (structure de la section, `<picture>`, textes), `src/styles/screens.css`
(`.home__hero`, `.home__visual` remplacée par un fond de section, voiles, points de rupture),
`public/brand/` (nouveaux fichiers), `index.html` (préchargement de l'image). Aucun autre écran touché.

## 9. Critères d'acceptation

1. Les deux visages sont nets et expressifs aux trois formats, jamais rognés par le texte.
2. Aucun texte, logo ni élément d'interface dans l'image.
3. Le rouge ne dépasse pas un accent ; l'ensemble reste sombre, chaleureux et lisible.
4. Le texte de l'accueil atteint 4,5:1 sur le voile, sur mobile 360 px comme sur bureau.
5. Poids chargés ≤ 180 kB sur mobile ; aucun saut de mise en page.
6. Rendu vérifié sur 360 px, 390 px, 768 px, 1440 px, en portrait et paysage.
7. Aucune image mineure, aucune nudité, aucune scène explicite.

---

Sources : brief « Désir & Tentation » du 23/11 ; cahier général §§2D, 11, 12 ; `src/screens/Home.tsx`,
`src/styles/screens.css`, `public/brand/`, `QSPICY_ASSET_PLAN.md`.

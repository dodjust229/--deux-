import type { Lang } from "./i18n";

export type GuideSection = { id: string; title: string; body: string[] };

const FR: GuideSection[] = [
  {
    id: "decouvrir",
    title: "Découvrir QSPICY",
    body: [
      "QSPICY est un jeu de conversation pour adultes, à deux ou à quatre. Deux personnages, Tao et Naya, mettent les cartes en scène : ils lisent, écoutent et réagissent.",
      "Aucun compte n'est créé. Une partie vit dans une salle privée, accessible seulement par un lien, et disparaît après quelques heures d'inactivité."
    ]
  },
  {
    id: "salon",
    title: "Choisir un salon",
    body: [
      "À Deux : deux personnes, une salle privée. C'est le mode complet aujourd'hui.",
      "DUOS : quatre personnes, deux duos fixes et trois espaces (tous ensemble, mon duo, l'autre duo). Les quatre doivent être présents pour démarrer.",
      "Côte à Côte, Anonyme et Personnalisé sont visibles mais verrouillés : leur moteur n'est pas encore disponible. Ils resteront fermés tant qu'ils ne seront pas réellement jouables."
    ]
  },
  {
    id: "creer",
    title: "Créer une partie",
    body: [
      "Choisis un prénom de jeu, un personnage, puis ouvre la salle. Un lien d'invitation est créé : c'est la seule façon d'entrer.",
      "Chaque personne choisit son personnage et garde ses préférences sur son propre appareil."
    ]
  },
  {
    id: "rejoindre",
    title: "Rejoindre une partie avec un lien",
    body: [
      "Ouvre le lien reçu : l'identifiant de la salle est déjà rempli. Choisis ton prénom et ton personnage, puis entre.",
      "Une salle pleine refuse les nouvelles personnes. On ne peut pas reprendre la place de quelqu'un d'autre sans son jeton de session."
    ]
  },
  {
    id: "niveaux",
    title: "Comprendre les niveaux d'intensité",
    body: [
      "Les cartes suivent quatre paliers : 1 Ça commence à piquer, 2 La tension monte, 3 On se lâche, 4 Ce qu'on n'avoue jamais.",
      "L'intensité choisie dans les préférences détermine les ambiances proposées par défaut : Soft (découverte et complicité), Hot (confidences et séduction), Very Hot (tout, y compris les cartes 18+).",
      "Les cartes 18+ ne sortent que si la catégorie Audacieux est choisie et que les deux personnes ont donné leur accord."
    ]
  },
  {
    id: "categories",
    title: "Comprendre les catégories et les préférences",
    body: [
      "Cinq ambiances existent : Découverte, Complicité, Profondeur, Séduction et Audacieux (18+). Seules les catégories choisies par tout le monde sont tirées.",
      "Les exclusions sont personnelles : une ambiance exclue ne te sera jamais proposée, même si l'autre la choisit."
    ]
  },
  {
    id: "salons-fonctions",
    title: "Utiliser les fonctionnalités de chaque salon",
    body: [
      "À Deux : réponses cachées jusqu'à la révélation, validation à deux pour avancer, pause partagée, stickers remplacés par des emojis natifs.",
      "DUOS : chaque réponse choisit sa visibilité (moi, mon duo, les quatre). Le salon commun n'est ouvert que si les quatre l'autorisent. Le duo opposé ne voit jamais vos échanges privés.",
      "Les autres salons n'ont pas encore de fonctionnalités : ne les ouvre pas, ils n'existent pas."
    ]
  },
  {
    id: "revelations",
    title: "Comprendre les réponses, révélations et relances",
    body: [
      "Une réponse est enregistrée immédiatement mais reste cachée jusqu'à ce que les personnes requises aient répondu. La révélation est simultanée.",
      "Une confidence privée ne quitte jamais ton appareil : l'autre voit seulement qu'elle a été gardée.",
      "Les relances n'existent pas encore. Aucune carte ne te relancera automatiquement."
    ]
  },
  {
    id: "personnalisation",
    title: "Utiliser les options de personnalisation",
    body: [
      "La personnalisation se limite aujourd'hui à ce qui est proposé : catégories, intensité, exclusions, langue, thème, sons et animations.",
      "Écrire ses propres questions n'est pas disponible : le jeu ne peut pas encore les intégrer à une salle. Le mode Personnalisé reste donc fermé."
    ]
  },
  {
    id: "consentement",
    title: "Consentement, passer, pause et sortie",
    body: [
      "Tu peux passer n'importe quelle question, sans justification et sans conséquence sur la suite.",
      "Le bouton SAFE est toujours accessible pendant une partie : pause pour les deux, sortie immédiate, ou sortie avec blocage mémorisé sur ton appareil.",
      "Le consentement 18+ est personnel et révocable : le retirer ferme immédiatement les cartes Audacieux."
    ]
  },
  {
    id: "parametres",
    title: "Paramètres, sons et animations",
    body: [
      "Les réglages restent sur ton appareil : thème, réduction des animations, sons et volume. L'autre personne garde les siens.",
      "La réduction des animations fige les mouvements sans masquer le contenu. Les sons sont désactivés par défaut."
    ]
  }
];

const EN: GuideSection[] = [
  {
    id: "decouvrir",
    title: "Discover QSPICY",
    body: [
      "QSPICY is a conversation game for adults, played by two or four people. Two characters, Tao and Naya, stage the cards: they read, listen and react.",
      "No account is created. A game lives in a private room, reachable only through a link, and disappears after a few hours of inactivity."
    ]
  },
  {
    id: "salon",
    title: "Choosing a room",
    body: [
      "À Deux: two people, one private room. It is the complete mode today.",
      "DUOS: four people, two fixed duos and three spaces (everyone together, my duo, the other duo). All four must be present to start.",
      "Side by Side, Anonymous and Custom are visible but locked: their engine is not available yet. They stay closed until they are genuinely playable."
    ]
  },
  {
    id: "creer",
    title: "Creating a game",
    body: [
      "Pick a game name and a character, then open the room. An invite link is created: it is the only way in.",
      "Each person picks a character and keeps their own preferences on their own device."
    ]
  },
  {
    id: "rejoindre",
    title: "Joining with a link",
    body: [
      "Open the link you received: the room id is already filled in. Choose your name and character, then step in.",
      "A full room refuses new people. Nobody can take someone else's seat without their session token."
    ]
  },
  {
    id: "niveaux",
    title: "Understanding intensity levels",
    body: [
      "Cards follow four steps: 1 It starts to tingle, 2 The tension rises, 3 We let go, 4 What we never confess.",
      "The intensity chosen in your preferences sets the default moods: Soft (discovery and banter), Hot (confessions and flirting), Very Hot (everything, including 18+ cards).",
      "18+ cards only appear when the Audacieux category is chosen and both people have agreed."
    ]
  },
  {
    id: "categories",
    title: "Understanding categories and preferences",
    body: [
      "Five moods exist: Discovery, Banter, Depth, Seduction and Audacieux (18+). Only the categories chosen by everyone are drawn.",
      "Exclusions are personal: an excluded mood is never offered to you, even if the other person picks it."
    ]
  },
  {
    id: "salons-fonctions",
    title: "What each room can do",
    body: [
      "À Deux: answers stay hidden until the reveal, both must confirm to move on, the pause is shared, stickers are replaced by native emojis.",
      "DUOS: each answer chooses who sees it (me, my duo, all four). The shared room opens only if all four allow it. The opposite duo never sees your private exchanges.",
      "The other rooms have no features yet: do not open them, they do not exist."
    ]
  },
  {
    id: "revelations",
    title: "Answers, reveals and prompts",
    body: [
      "An answer is stored immediately but stays hidden until the required people have answered. The reveal is simultaneous.",
      "A private confidence never leaves your device: the other person only sees that it was kept.",
      "Follow-up prompts do not exist yet. No card will prompt you automatically."
    ]
  },
  {
    id: "personnalisation",
    title: "Personalisation options",
    body: [
      "Personalisation is limited to what is offered today: categories, intensity, exclusions, language, theme, sound and motion.",
      "Writing your own questions is not available: the game cannot yet add them to a room. The Custom mode therefore stays closed."
    ]
  },
  {
    id: "consentement",
    title: "Consent, passing, pause and leaving",
    body: [
      "You can pass any question, without justification and with no consequence for what follows.",
      "The SAFE button is always available during a game: pause for both, leave immediately, or leave with a block remembered on your device.",
      "18+ consent is personal and revocable: withdrawing it immediately closes Audacieux cards."
    ]
  },
  {
    id: "parametres",
    title: "Settings, sound and motion",
    body: [
      "Settings stay on your device: theme, reduced motion, sound and volume. The other person keeps their own.",
      "Reduced motion freezes movement without hiding content. Sounds are off by default."
    ]
  }
];

export const GUIDE: Record<Lang, GuideSection[]> = { fr: FR, en: EN };

export type TipId = "mode" | "intensity" | "categories" | "prefs" | "invite" | "lobby" | "safe" | "levels";

const TIPS_FR: Record<TipId, { title: string; body: string }> = {
  mode: { title: "Quel salon ?", body: "À Deux et DUOS sont jouables. Les autres salons sont verrouillés : leur moteur n'existe pas encore." },
  intensity: { title: "À quoi sert l'intensité ?", body: "Elle choisit les ambiances proposées par défaut. Very Hot inclut les cartes 18+, toujours soumises à l'accord des deux." },
  categories: { title: "Catégories", body: "Seules les catégories choisies par tout le monde sont tirées. Une catégorie exclue dans tes préférences reste fermée." },
  prefs: { title: "Tes préférences", body: "Elles restent sur cet appareil et ne changent rien pour l'autre personne." },
  invite: { title: "Invitation", body: "Le lien contient l'identifiant de la salle. Sans lui, personne ne peut entrer ; une salle pleine refuse les autres." },
  lobby: { title: "Salle d'attente", body: "La partie démarre quand tout le monde est là, qu'une catégorie est commune et que les accords 18+ nécessaires sont donnés." },
  safe: { title: "SAFE", body: "Pause pour les deux, sortie immédiate ou sortie avec blocage mémorisé sur cet appareil." },
  levels: { title: "Niveaux", body: "Le niveau indique l'audace de la carte. Un changement de niveau s'annonce par un écran sombre, sans interrompre la partie." }
};

const TIPS_EN: Record<TipId, { title: string; body: string }> = {
  mode: { title: "Which room?", body: "À Deux and DUOS are playable. Other rooms are locked: their engine does not exist yet." },
  intensity: { title: "What does intensity do?", body: "It picks the default moods. Very Hot includes 18+ cards, always subject to both people's consent." },
  categories: { title: "Categories", body: "Only the categories chosen by everyone are drawn. A category excluded in your preferences stays closed." },
  prefs: { title: "Your preferences", body: "They stay on this device and change nothing for the other person." },
  invite: { title: "Invitation", body: "The link carries the room id. Without it nobody can enter; a full room refuses newcomers." },
  lobby: { title: "Waiting room", body: "The game starts when everyone is here, one category is shared and the required 18+ consents are given." },
  safe: { title: "SAFE", body: "Pause for both, leave immediately, or leave with a block remembered on this device." },
  levels: { title: "Levels", body: "The level shows how bold the card is. A level change is announced by a dark screen without stopping the game." }
};

export const TIPS: Record<Lang, Record<TipId, { title: string; body: string }>> = { fr: TIPS_FR, en: TIPS_EN };

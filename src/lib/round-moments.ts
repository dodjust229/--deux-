import type { Interaction } from "../types";

export interface RoundMoment {
  id: "deepen" | "reverse" | "play";
  title: string;
  label: string;
  prompt: string;
}

type MomentCopy = Pick<RoundMoment, "title" | "label" | "prompt">;
type MomentSet = Record<RoundMoment["id"], [MomentCopy, MomentCopy, MomentCopy]>;

const MOMENTS: Record<Interaction["category"], MomentSet> = {
  decouverte: {
    deepen: [
      { title: "Le détail qui change tout", label: "Creuser", prompt: "Quel détail précis de ta réponse l'autre ne connaissait probablement pas ? Raconte-le en une petite scène." },
      { title: "Derrière le souvenir", label: "Creuser", prompt: "Revenez sur le souvenir évoqué : qu'est-ce que vous n'aviez jamais pris le temps de vous raconter à son sujet ?" },
      { title: "Ce que tu n'avais pas dit", label: "Creuser", prompt: "Ajoutez chacun un détail que vous aviez gardé de côté au premier tour." }
    ],
    reverse: [
      { title: "À ta place", label: "Inverser", prompt: "Chacun reformule la réponse de l'autre comme s'il devait la raconter à sa place. L'autre corrige ou confirme." },
      { title: "Le détail deviné", label: "Inverser", prompt: "Devinez quel détail de votre réponse l'autre a préféré. Dites pourquoi avant qu'il vous le révèle." },
      { title: "Même scène, autre regard", label: "Inverser", prompt: "Racontez le même souvenir, mais cette fois du point de vue de l'autre." }
    ],
    play: [
      { title: "Votre bande-annonce", label: "Jouer", prompt: "Trouvez ensemble un titre et une phrase d'accroche pour un film inspiré de vos deux réponses." },
      { title: "Le souvenir à créer", label: "Jouer", prompt: "Imaginez un moment à vivre ensemble qui pourrait devenir votre prochain souvenir préféré." },
      { title: "Trois indices", label: "Jouer", prompt: "Chacun donne trois indices sur une envie ou une habitude évoquée. L'autre doit deviner de quoi il s'agit." }
    ]
  },
  complicite: {
    deepen: [
      { title: "Le fou rire caché", label: "Creuser", prompt: "Quel détail de votre réponse vous fait encore sourire aujourd'hui ? Racontez la version complète." },
      { title: "Le petit rituel", label: "Creuser", prompt: "Quel petit rituel entre vous mérite de devenir une vraie tradition ? Pourquoi celui-là ?" },
      { title: "Le compliment oublié", label: "Creuser", prompt: "Dites un compliment précis que vous pensez souvent, mais que vous ne formulez pas assez." }
    ],
    reverse: [
      { title: "Qui connaît qui ?", label: "Inverser", prompt: "Chacun devine ce que l'autre aurait répondu à la question. Révélez vos pronostics en même temps." },
      { title: "Le portrait croisé", label: "Inverser", prompt: "Décrivez l'autre en trois mots à partir de vos réponses. Il ou elle peut en garder un et en contester un." },
      { title: "Le rôle inversé", label: "Inverser", prompt: "Échangez les rôles : chacun répond maintenant comme s'il était l'autre. Comparez vos imitations." }
    ],
    play: [
      { title: "Le compliment express", label: "Jouer", prompt: "En quinze secondes, trouvez un compliment inédit. Interdiction de répondre seulement « tu es beau/belle »." },
      { title: "Le défi du fou rire", label: "Jouer", prompt: "Inventez une devise absurde qui résume votre duo. Vous devez être capables de la ressortir demain." },
      { title: "Le prochain rendez-vous", label: "Jouer", prompt: "Proposez chacun une idée de rendez-vous réalisable avec vos moyens actuels. Choisissez celle qui vous enthousiasme le plus." }
    ]
  },
  profondeur: {
    deepen: [
      { title: "Le besoin derrière les mots", label: "Creuser", prompt: "Quel besoin se cache derrière ta réponse : être rassuré, compris, désiré, respecté ou autre chose ?" },
      { title: "Ce qui compte vraiment", label: "Creuser", prompt: "Qu'est-ce que cette réponse révèle sur ce qui compte le plus pour toi dans votre relation ?" },
      { title: "La phrase difficile", label: "Creuser", prompt: "Complète cette phrase : « J'aimerais que tu comprennes mieux que… » Tu peux passer ton tour." }
    ],
    reverse: [
      { title: "Écoute sans corriger", label: "Inverser", prompt: "Reformulez la réponse de l'autre sans la discuter ni vous défendre. Demandez ensuite : « Est-ce que j'ai bien compris ? »" },
      { title: "Ce que j'entends", label: "Inverser", prompt: "Dites ce que vous avez compris du besoin de l'autre, puis laissez-le corriger votre interprétation." },
      { title: "Le point commun", label: "Inverser", prompt: "Trouvez un point commun dans vos réponses, même s'il est petit. Expliquez pourquoi il compte." }
    ],
    play: [
      { title: "Une chose concrète", label: "Jouer", prompt: "Chacun propose une petite action réaliste à faire cette semaine pour répondre à ce besoin." },
      { title: "La promesse tenable", label: "Jouer", prompt: "Choisissez un geste simple que vous pouvez réellement tenir, sans promesse spectaculaire." },
      { title: "Le mot juste", label: "Jouer", prompt: "Trouvez chacun un mot qui résume ce que vous voulez protéger dans votre relation. Comparez." }
    ]
  },
  seduction: {
    deepen: [
      { title: "Le détail magnétique", label: "Creuser", prompt: "Quel détail précis chez l'autre déclenche cette attirance ? Décrivez-le sans vous réfugier dans un compliment vague." },
      { title: "Le moment du déclic", label: "Creuser", prompt: "À quel moment précis cette attirance se fait-elle sentir le plus ? Qu'est-ce qui change dans votre attitude ?" },
      { title: "Ce que tu remarques", label: "Creuser", prompt: "Dites ce que vous remarquez chez l'autre quand il ou elle cherche à vous séduire." }
    ],
    reverse: [
      { title: "Le désir deviné", label: "Inverser", prompt: "Devinez le geste, le mot ou l'attention que l'autre aurait choisi. Laissez-le confirmer ou vous surprendre." },
      { title: "À ton tour de séduire", label: "Inverser", prompt: "Inversez les rôles : celui qui répondait en premier devient celui qui doit séduire l'autre avec une phrase." },
      { title: "Le signal secret", label: "Inverser", prompt: "Chacun révèle un signe discret qui lui fait comprendre que l'autre est d'humeur à séduire." }
    ],
    play: [
      { title: "Une phrase, pas un cliché", label: "Jouer", prompt: "Séduisez l'autre avec une seule phrase. Évitez les compliments tout faits : soyez précis." },
      { title: "Le scénario minute", label: "Jouer", prompt: "Imaginez le début d'un rendez-vous en trois détails : le lieu, l'ambiance et la première phrase." },
      { title: "Le regard qui parle", label: "Jouer", prompt: "Si vous en avez envie, tenez un regard quelques secondes. Sinon, décrivez simplement ce que ce regard vous ferait ressentir." }
    ]
  },
  audacieux: {
    deepen: [
      { title: "La limite qui rassure", label: "Creuser", prompt: "Quelle limite ou quelle condition vous permettrait d'explorer cette envie en confiance ? Une réponse peut rester privée." },
      { title: "Le vrai feu vert", label: "Creuser", prompt: "Qu'est-ce qui vous ferait vous sentir libre de dire oui, non ou pas maintenant sans devoir vous justifier ?" },
      { title: "L'envie derrière le fantasme", label: "Creuser", prompt: "Au-delà du scénario, quelle sensation recherchez-vous : nouveauté, confiance, jeu, abandon ou complicité ?" }
    ],
    reverse: [
      { title: "Le pronostic", label: "Inverser", prompt: "Révélez ce qui vous a mis sur cette piste : quel indice vous a fait deviner la réponse de l'autre ?" },
      { title: "L'envie reformulée", label: "Inverser", prompt: "Reformulez l'envie de l'autre sans la transformer en promesse. Demandez si votre compréhension est juste." },
      { title: "Ce qui est négociable", label: "Inverser", prompt: "Distinguez ensemble ce qui vous intrigue, ce que vous accepteriez de discuter et ce qui reste hors limites." }
    ],
    play: [
      { title: "Le feu vert", label: "Jouer", prompt: "Imaginez une suite qui vous tente tous les deux. Chacun peut proposer, ajuster ou refuser librement : rien n'est un engagement." },
      { title: "Oui, non, peut-être", label: "Jouer", prompt: "Chacun nomme une idée dans trois zones : oui, peut-être après discussion, non. Aucun débat pour faire changer un non." },
      { title: "La règle du jeu", label: "Jouer", prompt: "Inventez une règle simple qui rendrait un jeu de séduction plus excitant et plus sûr pour vous deux." }
    ]
  }
};

/**
 * Trois relances facultatives, stables pour une carte donnée.
 * Elles guident une vraie conversation après la révélation sans inventer
 * de score, modifier les réponses ou écrire dans la base.
 */
export function getRoundMoments(interaction: Pick<Interaction, "id" | "category" | "kind" | "visibility">): RoundMoment[] {
  const hash = [...interaction.id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
  const offset = hash % 3;
  const selected = MOMENTS[interaction.category];
  const pick = (id: RoundMoment["id"]): MomentCopy => selected[id][offset];

  const deepen = interaction.visibility === "privee"
    ? { title: "Respecter le jardin secret", label: "Creuser", prompt: "Sans demander le contenu de la confidence, dites ce qui vous aiderait à vous sentir écouté et respecté quand vous gardez quelque chose pour vous." }
    : pick("deepen");
  const reverse = interaction.kind === "prediction"
    ? { title: "Le pronostic", label: "Inverser", prompt: "Révélez ce qui vous a mis sur cette piste : quel indice vous a fait deviner la réponse de l'autre ?" }
    : pick("reverse");

  return [
    { id: "deepen", ...deepen },
    { id: "reverse", ...reverse },
    { id: "play", ...pick("play") }
  ];
}

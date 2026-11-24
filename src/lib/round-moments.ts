import type { Interaction } from "../types";

export interface RoundMoment {
  id: "deepen" | "reverse" | "play";
  title: string;
  label: string;
  prompt: string;
}

/**
 * Trois relances facultatives, stables pour une carte donnée.
 * Elles guident une vraie conversation après la révélation sans inventer
 * de score, modifier les réponses ou écrire dans la base.
 */
export function getRoundMoments(interaction: Pick<Interaction, "id" | "category" | "kind" | "visibility">): RoundMoment[] {
  const privateMode = interaction.visibility === "privee";
  const sets: Record<string, Omit<RoundMoment, "id">[]> = {
    deepen: [
      { title: "Le détail qui change tout", label: "Creuser", prompt: "Chacun précise le détail qu'il n'a pas réussi à formuler dans sa première réponse. Une phrase chacun, sans se couper." },
      { title: "Derrière la réponse", label: "Creuser", prompt: "Demandez-vous simplement : « Qu'est-ce qui te fait dire ça ? » Laissez l'autre aller au bout de son idée." },
      { title: "La vraie raison", label: "Creuser", prompt: "Reprenez un mot important de vos réponses et expliquez ce qu'il signifie vraiment pour vous." }
    ],
    reverse: [
      { title: "À ta place", label: "Inverser", prompt: "Chacun reformule la réponse de l'autre comme s'il devait la défendre. L'autre corrige ou confirme." },
      { title: "Ce que j'avais deviné", label: "Inverser", prompt: "Avant de commenter, dites ce que vous pensiez que l'autre allait répondre. Qu'est-ce qui vous a surpris ?" },
      { title: "Le miroir", label: "Inverser", prompt: "Échangez les rôles : chacun répond maintenant à la question à la place de l'autre, puis comparez." }
    ],
    play: [
      { title: "Le détail interdit", label: "Jouer", prompt: "En 20 secondes, trouvez ensemble un titre de film qui résume vos deux réponses. Le plus drôle gagne… si vous êtes d'accord." },
      { title: "Une phrase de plus", label: "Jouer", prompt: "Chacun ajoute une seule phrase qui rend sa réponse plus précise, plus drôle ou plus audacieuse. Pas de justification obligatoire." },
      { title: "Le choix immédiat", label: "Jouer", prompt: "Sans réfléchir longtemps, chacun choisit un mot pour résumer ce qu'il vient d'apprendre sur l'autre. Comparez vos deux mots." }
    ]
  };

  const hash = [...interaction.id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
  const offset = hash % 3;
  const pick = (key: keyof typeof sets) => sets[key][offset];

  const deepen = privateMode
    ? { title: "Respecter le jardin secret", label: "Creuser", prompt: "Sans demander le contenu de la confidence, dites ce qui vous aiderait à vous sentir écouté et respecté quand vous gardez quelque chose pour vous." }
    : pick("deepen");
  const reverse = interaction.kind === "prediction"
    ? { title: "Le pronostic", label: "Inverser", prompt: "Révélez ce qui vous a mis sur cette piste : quel indice vous a fait deviner la réponse de l'autre ?" }
    : pick("reverse");
  const play = interaction.category === "audacieux"
    ? { title: "Le feu vert", label: "Jouer", prompt: "Imaginez une suite qui vous tente tous les deux. Chacun peut proposer, ajuster ou refuser librement : rien n'est un engagement." }
    : pick("play");

  return [
    { id: "deepen", ...deepen },
    { id: "reverse", ...reverse },
    { id: "play", ...play }
  ];
}

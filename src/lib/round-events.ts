import type { Interaction } from "../types";

export interface RoundEvent {
  id: string;
  title: string;
  subtitle: string;
  instruction: string;
  cue: string;
}

const EVENTS: RoundEvent[] = [
  { id: "mirror", title: "Le miroir", subtitle: "SURPRISE · RÉPONSE SECRÈTE", instruction: "Avant de répondre, devine mentalement ce que l'autre va écrire. Ne donne aucun indice. Après la révélation, comparez vos intuitions.", cue: "Qui connaît vraiment l'autre ?" },
  { id: "detail", title: "Le détail qui change tout", subtitle: "SURPRISE · PRÉCISION", instruction: "Pas de réponse vague : ajoute un détail concret, un geste, une phrase ou un moment précis qui rend ta réponse vraie.", cue: "Le concret vaut mieux qu'un joli discours." },
  { id: "reverse", title: "À sa place", subtitle: "SURPRISE · RÔLES INVERSÉS", instruction: "Réponds d'abord comme tu imagines que l'autre répondrait. Après la révélation, donne ta vraie réponse et voyez où vos visions se croisent.", cue: "Attention aux certitudes." },
  { id: "scene", title: "La scène", subtitle: "SURPRISE · CINÉMA", instruction: "Raconte ta réponse comme une courte scène : un lieu, un geste et une phrase. Faites-la vivre au lieu de la résumer.", cue: "Faites entrer l'autre dans le moment." },
  { id: "one-line", title: "Une seule phrase", subtitle: "SURPRISE · SANS DÉTOUR", instruction: "Réponds en une seule phrase, sans préambule ni justification. L'autre pourra demander un seul éclaircissement après la révélation.", cue: "Court, net, assumé." },
  { id: "no-cliche", title: "Zéro cliché", subtitle: "SURPRISE · AUTHENTICITÉ", instruction: "Évite les réponses automatiques comme « ça dépend », « comme tu veux » ou « je ne sais pas ». Dis ce que tu penses réellement, ou passe.", cue: "Pas de réponse pour faire plaisir." },
  { id: "senses", title: "Les cinq sens", subtitle: "SURPRISE · IMMERSION", instruction: "Ajoute un détail sensoriel à ta réponse : une ambiance, un son, une texture, une odeur ou une sensation. Choisis celui qui raconte le mieux ton idée.", cue: "Fais ressentir, pas seulement comprendre." },
  { id: "counterpoint", title: "Le contre-pied", subtitle: "SURPRISE · ANGLE INATTENDU", instruction: "Ne prends pas ton premier réflexe. Cherche l'angle auquel l'autre ne s'attend pas, tout en restant sincère.", cue: "Surprends sans jouer un personnage." },
  { id: "bold-choice", title: "Le choix assumé", subtitle: "SURPRISE · PAS D'ÉCHAPPATOIRE", instruction: "S'il y a plusieurs possibilités, choisis celle qui te ressemble le plus aujourd'hui. Explique ton choix avec un détail, sans te cacher derrière « un peu tout ».", cue: "Une préférence claire vaut mieux qu'une liste." },
  { id: "question-back", title: "La question retour", subtitle: "SURPRISE · ÉCHANGE", instruction: "Réponds franchement, puis prépare une question courte à poser à l'autre sur le même sujet. La discussion continue dans les deux sens.", cue: "Une réponse ouvre une autre porte." },
  { id: "future", title: "Et si c'était demain ?", subtitle: "SURPRISE · PROJECTION", instruction: "Réponds en te projetant dans les prochaines 24 heures : qu'est-ce que tu ferais concrètement, et comment l'autre le saurait-il ?", cue: "Transformez l'idée en possibilité réelle." },
  { id: "truth", title: "La vérité derrière la réponse", subtitle: "SURPRISE · SINCÉRITÉ", instruction: "Ajoute ce que tu n'aurais pas dit spontanément. Tu peux rester pudique ou passer : la sincérité n'oblige jamais à tout dévoiler.", cue: "La confiance compte plus que la confession." }
];


const ENGLISH: Record<string, Omit<RoundEvent, "id">> = {
  mirror: { title: "The mirror", subtitle: "SURPRISE · SECRET ANSWER", instruction: "Before answering, silently guess what the other person will write. Give no hints. After the reveal, compare your instincts.", cue: "Who really knows whom?" },
  detail: { title: "The detail that changes everything", subtitle: "SURPRISE · BE SPECIFIC", instruction: "No vague answers: add one concrete detail, gesture, sentence or moment that makes your answer real.", cue: "Specific beats polished." },
  reverse: { title: "In their shoes", subtitle: "SURPRISE · SWITCH ROLES", instruction: "First answer as you imagine the other person would. After the reveal, give your real answer and see where your views meet.", cue: "Careful with assumptions." },
  scene: { title: "The scene", subtitle: "SURPRISE · CINEMATIC", instruction: "Tell your answer as a short scene: a place, a gesture and a line. Make it come alive instead of summarizing it.", cue: "Let the other person step into the moment." },
  "one-line": { title: "One sentence only", subtitle: "SURPRISE · NO DETOURS", instruction: "Answer in one sentence, with no preamble or justification. After the reveal, the other person may ask one clarifying question.", cue: "Short, clear, owned." },
  "no-cliche": { title: "No clichés", subtitle: "SURPRISE · BE REAL", instruction: "Avoid automatic answers like “it depends”, “whatever you want” or “I don't know”. Say what you really think, or pass.", cue: "Don't answer just to please." },
  senses: { title: "The five senses", subtitle: "SURPRISE · IMMERSION", instruction: "Add one sensory detail: an atmosphere, sound, texture, scent or feeling. Pick the one that best tells your story.", cue: "Make it felt, not just understood." },
  counterpoint: { title: "The unexpected angle", subtitle: "SURPRISE · SWITCH IT UP", instruction: "Don't take your first reflex. Find an angle the other person won't expect, while staying sincere.", cue: "Surprise without pretending." },
  "bold-choice": { title: "Own your choice", subtitle: "SURPRISE · PICK ONE", instruction: "If there are several possibilities, choose the one that feels most like you today. Explain with one detail instead of hiding behind “a bit of everything”.", cue: "A clear preference beats a list." },
  "question-back": { title: "Your turn to ask", subtitle: "SURPRISE · TWO-WAY", instruction: "Answer honestly, then prepare one short question for the other person on the same subject. Let the conversation go both ways.", cue: "One answer opens another door." },
  future: { title: "What if it were tomorrow?", subtitle: "SURPRISE · LOOK AHEAD", instruction: "Imagine the next 24 hours: what would you actually do, and how would the other person know?", cue: "Turn an idea into a real possibility." },
  truth: { title: "The truth behind the answer", subtitle: "SURPRISE · HONESTY", instruction: "Add something you wouldn't have said spontaneously. You can keep your privacy or pass: honesty never means revealing everything.", cue: "Trust matters more than confession." }
};

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

/**
 * A shared, deterministic surprise round. All devices in one room derive the
 * same event from the room id, card id and index; no extra database state is
 * needed. The event cadence is every third round plus the finale.
 */
export function getRoundEvent(
  roomId: string,
  roundIndex: number,
  total: number,
  interaction: Pick<Interaction, "id" | "category" | "kind" | "level">,
  lang: "fr" | "en" = "fr"
): RoundEvent | null {
  if (!roomId || !Number.isInteger(roundIndex) || roundIndex < 0 || total < 1 || roundIndex >= total) return null;
  const isFinale = roundIndex === total - 1;
  const isSurpriseRound = (roundIndex + 1) % 3 === 0;
  if (!isFinale && !isSurpriseRound) return null;

  const seed = hash(`${roomId}:${interaction.id}:${roundIndex}:${interaction.category}:${interaction.kind}:${interaction.level}`);
  const event = EVENTS[seed % EVENTS.length];
  const translated = lang === "en" ? { id: event.id, ...ENGLISH[event.id] } : event;
  if (!isFinale) return translated;
  return lang === "en"
    ? { ...translated, subtitle: "FINAL ROUND · SURPRISE", cue: "Finish with an answer you will remember." }
    : { ...translated, subtitle: "DERNIER TOUR · SURPRISE", cue: "Terminez sur une réponse dont vous vous souviendrez." };
}

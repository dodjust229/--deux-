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



const LEVEL3_EVENTS: RoundEvent[] = [
  { id: "l3-confession", title: "L'aveu précis", subtitle: "PALIER 3 · SURPRISE", instruction: "Nomme une envie sensuelle précise que tu aimerais partager avec l'autre. Dis ce qui te plaît dans cette idée, sans la transformer en obligation.", cue: "Une envie exprimée n'est pas une promesse." },
  { id: "l3-touch", title: "Le geste qui t'allume", subtitle: "PALIER 3 · SURPRISE", instruction: "Quel geste précis de l'autre fait monter ton désir : un baiser, une main, une caresse, un regard ou une phrase ? Choisis et explique.", cue: "Sois précis, pas vague." },
  { id: "l3-words", title: "Les mots qui troublent", subtitle: "PALIER 3 · SURPRISE", instruction: "Quelle phrase ou quel mot prononcé par l'autre peut intensifier ton désir ? Donne un exemple que tu aimerais entendre.", cue: "Le désir passe aussi par les mots." },
  { id: "l3-rhythm", title: "Le rythme qui te convient", subtitle: "PALIER 3 · SURPRISE", instruction: "Quand un moment intime devient intense, quel rythme préfères-tu : lent, soutenu, alterné ou guidé par tes réactions ? Explique ce qui te convient.", cue: "Le bon rythme se choisit à deux." },
  { id: "l3-greenlight", title: "Le feu vert", subtitle: "PALIER 3 · SURPRISE", instruction: "Nomme un signe clair qui te fait comprendre que l'autre a envie de continuer, puis un signal qui doit faire ralentir ou arrêter immédiatement.", cue: "Le désir et le consentement avancent ensemble." },
  { id: "l3-scene", title: "Le scénario en trois détails", subtitle: "PALIER 3 · SURPRISE", instruction: "Imagine un moment sensuel en trois détails : l'ambiance, le premier geste et ce qui te ferait te sentir désiré. Cela reste une imagination, pas un engagement.", cue: "Faites monter la tension sans pression." },
  { id: "l3-initiative", title: "L'initiative attendue", subtitle: "PALIER 3 · SURPRISE", instruction: "Quelle initiative de séduction aimerais-tu que l'autre prenne plus souvent ? Formule-la clairement et laisse-lui la liberté d'en discuter.", cue: "Demander franchement vaut mieux que faire deviner." },
  { id: "l3-boundary", title: "La limite qui libère", subtitle: "PALIER 3 · SURPRISE", instruction: "Dis une limite qui doit être respectée dans l'intimité, puis une chose que tu aimerais explorer à l'intérieur de ce cadre.", cue: "Une limite claire peut renforcer la confiance." }
];

const LEVEL4_EVENTS: RoundEvent[] = [
  { id: "l4-fantasy", title: "Le fantasme sans détour", subtitle: "PALIER 4 · SURPRISE", instruction: "Quel fantasme sexuel précis aimerais-tu raconter à l'autre, même si tu ne souhaites pas forcément le réaliser ? Dis ce qui t'excite dans ce scénario.", cue: "Parler d'un fantasme ne vaut jamais accord pour le réaliser." },
  { id: "l4-practice", title: "La pratique qui t'intrigue", subtitle: "PALIER 4 · SURPRISE", instruction: "Quelle pratique sexuelle consensuelle t'intrigue assez pour que tu aies envie d'en parler franchement ? Qu'aimerais-tu comprendre avant d'envisager quoi que ce soit ?", cue: "Curiosité ne signifie pas consentement." },
  { id: "l4-request", title: "La demande sexuelle claire", subtitle: "PALIER 4 · SURPRISE", instruction: "Formule une demande sexuelle précise que tu aimerais faire à l'autre. Il ou elle peut répondre oui, non ou pas maintenant, sans négociation.", cue: "Une demande claire laisse une vraie liberté." },
  { id: "l4-body", title: "Le point de contact", subtitle: "PALIER 4 · SURPRISE", instruction: "Quelle partie de ton corps aimerais-tu que l'autre embrasse, caresse ou touche davantage ? Dis précisément ce que tu apprécies et ce qui reste hors limites.", cue: "Le corps n'est pas un terrain de devinettes." },
  { id: "l4-foreplay", title: "Les préliminaires", subtitle: "PALIER 4 · SURPRISE", instruction: "Quels préliminaires te donnent le plus envie : baisers, caresses, mots, massage ou autre chose ? Décris ce que tu préfères vraiment.", cue: "Le plaisir se construit, il ne se présume pas." },
  { id: "l4-words", title: "Les mots pendant le sexe", subtitle: "PALIER 4 · SURPRISE", instruction: "Quels mots aimerais-tu entendre pendant un rapport sexuel ? Donne une phrase exacte, puis précise les mots ou tons que tu ne veux pas entendre.", cue: "Dire ce qui plaît évite de supposer." },
  { id: "l4-dynamic", title: "La dynamique choisie", subtitle: "PALIER 4 · SURPRISE", instruction: "Dans un jeu intime consenti, préfères-tu mener, te laisser guider ou alterner ? Explique ce qui t'attire et ce qui ne te convient pas.", cue: "Aucun rôle n'est imposé." },
  { id: "l4-orgasm", title: "Le plaisir à ne pas deviner", subtitle: "PALIER 4 · SURPRISE", instruction: "Qu'est-ce qui t'aide le plus à prendre du plaisir pendant le sexe : le rythme, les caresses, les mots, la durée, la confiance ou autre chose ? Dis-le sans détour.", cue: "Le plaisir se communique, il ne se devine pas." },
  { id: "l4-after", title: "Après le rapport", subtitle: "PALIER 4 · SURPRISE", instruction: "Après un rapport sexuel, de quoi as-tu le plus besoin : tendresse, discussion, calme, rire, espace ou contact physique ? Dis ce que tu veux réellement.", cue: "L'après fait aussi partie de l'intimité." },
  { id: "l4-no", title: "Le non sans détour", subtitle: "PALIER 4 · SURPRISE", instruction: "Nomme une chose que tu ne veux pas faire sexuellement, même par curiosité, et explique comment tu souhaites que l'autre accueille ce non.", cue: "Un non n'a pas besoin d'être justifié." },
  { id: "l4-next", title: "La prochaine fois", subtitle: "PALIER 4 · SURPRISE", instruction: "Quelle initiative intime aimerais-tu proposer lors de votre prochain moment à deux ? Sois concret, puis demande à l'autre ce qui lui donnerait envie ou non.", cue: "Une proposition, jamais une obligation." },
  { id: "l4-secret", title: "Ce que tu n'as jamais formulé", subtitle: "PALIER 4 · SURPRISE", instruction: "Quelle envie sexuelle as-tu déjà eue sans jamais oser la formuler clairement ? Tu peux la dire, l'écrire en privé ou passer.", cue: "La confidence reste un choix." }
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

  "l3-confession": { title: "The specific confession", subtitle: "LEVEL 3 · SURPRISE", instruction: "Name one specific sensual desire you'd like to share. Say what appeals to you, without turning it into an obligation.", cue: "Expressing a desire is not a promise." },
  "l3-touch": { title: "The touch that turns you on", subtitle: "LEVEL 3 · SURPRISE", instruction: "What specific gesture from the other person builds your desire: a kiss, a hand, a caress, a look or a phrase? Choose and explain.", cue: "Be specific, not vague." },
  "l3-words": { title: "Words that get to you", subtitle: "LEVEL 3 · SURPRISE", instruction: "What phrase or word from the other person can intensify your desire? Give an example you'd like to hear.", cue: "Desire also lives in words." },
  "l3-rhythm": { title: "The rhythm that works for you", subtitle: "LEVEL 3 · SURPRISE", instruction: "When an intimate moment gets intense, what pace do you prefer: slow, steady, changing or guided by your reactions? Explain what feels right.", cue: "The right pace is chosen together." },
  "l3-greenlight": { title: "The green light", subtitle: "LEVEL 3 · SURPRISE", instruction: "Name one clear sign that tells you the other person wants to continue, then one signal that must make things slow down or stop immediately.", cue: "Desire and consent move together." },
  "l3-scene": { title: "Three details, one scene", subtitle: "LEVEL 3 · SURPRISE", instruction: "Imagine a sensual moment in three details: the atmosphere, the first gesture and what would make you feel desired. It's imagination, not a commitment.", cue: "Build tension without pressure." },
  "l3-initiative": { title: "The move you're waiting for", subtitle: "LEVEL 3 · SURPRISE", instruction: "What move would you like the other person to make more often when flirting? Say it clearly and leave room to discuss it.", cue: "Asking clearly beats making someone guess." },
  "l3-boundary": { title: "The boundary that frees you", subtitle: "LEVEL 3 · SURPRISE", instruction: "Name one boundary that must be respected in intimacy, then one thing you'd like to explore within that boundary.", cue: "A clear boundary can build trust." },
  "l4-fantasy": { title: "The fantasy, no detours", subtitle: "LEVEL 4 · SURPRISE", instruction: "What specific sexual fantasy would you like to tell the other person about, even if you don't necessarily want to act on it? Say what excites you about it.", cue: "Talking about a fantasy is never consent to act on it." },
  "l4-practice": { title: "The practice you're curious about", subtitle: "LEVEL 4 · SURPRISE", instruction: "What consensual sexual practice are you curious enough to discuss openly? What would you need to understand before considering anything?", cue: "Curiosity is not consent." },
  "l4-request": { title: "The clear sexual request", subtitle: "LEVEL 4 · SURPRISE", instruction: "Make one specific sexual request you'd like to ask the other person. They can say yes, no or not now, without negotiation.", cue: "A clear request leaves real freedom." },
  "l4-body": { title: "The point of contact", subtitle: "LEVEL 4 · SURPRISE", instruction: "Which part of your body would you like the other person to kiss, caress or touch more? Be specific about what you enjoy and what stays off-limits.", cue: "Your body is not a guessing game." },
  "l4-foreplay": { title: "Foreplay", subtitle: "LEVEL 4 · SURPRISE", instruction: "What kind of foreplay turns you on most: kissing, caressing, words, massage or something else? Describe what you genuinely prefer.", cue: "Pleasure is built, never assumed." },
  "l4-words": { title: "Words during sex", subtitle: "LEVEL 4 · SURPRISE", instruction: "What words would you like to hear during sex? Give an exact phrase, then name words or tones you don't want to hear.", cue: "Saying what you like beats guessing." },
  "l4-dynamic": { title: "The dynamic you choose", subtitle: "LEVEL 4 · SURPRISE", instruction: "In a consensual intimate game, do you prefer to lead, be guided or alternate? Explain what appeals to you and what doesn't.", cue: "No role is imposed." },
  "l4-orgasm": { title: "Pleasure is not a guessing game", subtitle: "LEVEL 4 · SURPRISE", instruction: "What helps you enjoy sex most: pace, caresses, words, duration, trust or something else? Say it directly.", cue: "Pleasure is communicated, not guessed." },
  "l4-after": { title: "After sex", subtitle: "LEVEL 4 · SURPRISE", instruction: "After sex, what do you need most: affection, conversation, quiet, laughter, space or physical contact? Say what you really want.", cue: "Aftercare is part of intimacy." },
  "l4-no": { title: "The no, clearly stated", subtitle: "LEVEL 4 · SURPRISE", instruction: "Name one thing you do not want to do sexually, even out of curiosity, and explain how you'd like the other person to receive that no.", cue: "A no needs no justification." },
  "l4-next": { title: "Next time", subtitle: "LEVEL 4 · SURPRISE", instruction: "What intimate move would you like to suggest for your next time together? Be concrete, then ask what would or wouldn't appeal to the other person.", cue: "A proposal, never an obligation." },
  "l4-secret": { title: "What you've never put into words", subtitle: "LEVEL 4 · SURPRISE", instruction: "What sexual desire have you had but never dared to put into words? You can say it, write it privately or pass.", cue: "Sharing is always a choice." },
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
  const deck = interaction.level >= 4 ? LEVEL4_EVENTS : interaction.level === 3 ? LEVEL3_EVENTS : EVENTS;
  const event = deck[seed % deck.length];
  const translated = lang === "en" ? { id: event.id, ...ENGLISH[event.id] } : event;
  if (!isFinale) return translated;
  return lang === "en"
    ? { ...translated, subtitle: `FINAL ROUND · LEVEL ${interaction.level}`, cue: "Finish with an answer you will remember." }
    : { ...translated, subtitle: `DERNIER TOUR · PALIER ${interaction.level}`, cue: "Terminez sur une réponse dont vous vous souviendrez." };
}

import type { Lang } from "./i18n";
import type { Category, Interaction } from "../types";

export const CUSTOM = { min: 5, max: 24, minChars: 5, maxChars: 280 } as const;

/** Messages d'erreur affichés à l'écran et renvoyés par la validation serveur (E_CUSTOM). */
const MESSAGES = {
  fr: {
    count: `Il faut au moins ${CUSTOM.min} questions (${CUSTOM.max} au maximum).`,
    empty: "Une question est vide.",
    tooShort: `Chaque question doit faire au moins ${CUSTOM.minChars} caractères.`,
    tooLong: `Chaque question ne peut pas dépasser ${CUSTOM.maxChars} caractères.`,
    duplicate: "Deux questions sont identiques.",
    ready: "Prêt à lancer."
  },
  en: {
    count: `You need at least ${CUSTOM.min} questions (${CUSTOM.max} at most).`,
    empty: "A question is empty.",
    tooShort: `Each question needs at least ${CUSTOM.minChars} characters.`,
    tooLong: `Each question cannot be longer than ${CUSTOM.maxChars} characters.`,
    duplicate: "Two questions are identical.",
    ready: "Ready to start."
  }
} as const;

export type CustomError = keyof typeof MESSAGES["fr"];

export interface CustomCheck {
  ok: boolean;
  /** Questions normalisées (espaces ôtés), dans l'ordre écrit : c'est l'ordre joué. */
  questions: string[];
  errors: CustomError[];
  /** Index (dans la liste saisie) des lignes fautives, pour les surligner. */
  badIndexes: number[];
}

/**
 * Valide la liste saisie avant l'envoi au serveur. Le serveur refait exactement ces contrôles
 * (`start_custom_game`) : ce n'est pas un contournement, c'est un retour immédiat à l'écran.
 * Les lignes vides sont ignorées : elles correspondent à un champ laissé libre, pas à une erreur.
 */
export function checkQuestions(raw: readonly string[]): CustomCheck {
  const questions: string[] = [];
  const errors: CustomError[] = [];
  const badIndexes: number[] = [];
  const seen = new Set<string>();

  raw.forEach((line, index) => {
    const text = line.trim();
    if (!text) return;
    if (text.length < CUSTOM.minChars) {
      errors.push("tooShort");
      badIndexes.push(index);
      return;
    }
    if (text.length > CUSTOM.maxChars) {
      errors.push("tooLong");
      badIndexes.push(index);
      return;
    }
    const key = text.toLocaleLowerCase();
    if (seen.has(key)) {
      errors.push("duplicate");
      badIndexes.push(index);
      return;
    }
    seen.add(key);
    questions.push(text);
  });

  // Un défaut de contenu est plus utile à l'écran qu'un simple comptage : on ne l'ajoute
  // que si rien d'autre n'est signalé, et on borne aussi le maximum.
  if (errors.length === 0 && (questions.length < CUSTOM.min || questions.length > CUSTOM.max)) {
    errors.push("count");
  }

  return { ok: errors.length === 0, questions, errors: [...new Set(errors)], badIndexes };
}

export function customMessage(lang: Lang, error: CustomError): string {
  return MESSAGES[lang][error];
}

/** Traduit une erreur serveur `E_CUSTOM: …` en message utilisable, sans jargon. */
export function explainCustomError(lang: Lang, message: string): string {
  if (/could not find the function|does not exist/i.test(message)) {
    return lang === "fr"
      ? "Le salon Personnalisé n'est pas encore ouvert sur ce serveur : ses questions ne peuvent pas être enregistrées."
      : "The Custom room is not open on this server yet: its questions cannot be saved.";
  }
  if (!message.includes("E_CUSTOM")) return message;
  if (/24/.test(message)) return customMessage(lang, "count");
  if (/280/.test(message)) return customMessage(lang, "tooLong");
  if (/5 caractères|5 characters/.test(message)) return customMessage(lang, "tooShort");
  if (/identiques|identical/.test(message)) return customMessage(lang, "duplicate");
  return lang === "fr" ? "Ces questions ne peuvent pas être envoyées." : "These questions cannot be sent.";
}

/**
 * Carte affichée pour une question personnalisée. Le serveur ne renvoie qu'un identifiant
 * de séquence (`perso-n`) : le texte vient de la liste de la salle, jamais d'une valeur locale
 * différente entre les deux joueurs.
 */
export function customInteraction(id: string, text: string, index: number): Interaction {
  return {
    id,
    category: "decouverte",
    kind: "free",
    title: `Question ${index + 1}`,
    prompt: text,
    level: 2,
    audience: "partner",
    visibility: "partagee"
  };
}

/** Résout la carte courante à partir de l'identifiant de séquence et de la liste de la salle. */
export function resolveCustomInteraction(interactionId: string | null, deck: readonly string[]): Interaction | null {
  if (!interactionId || !interactionId.startsWith("perso-")) return null;
  const index = Number.parseInt(interactionId.slice("perso-".length), 10) - 1;
  const text = deck[index];
  if (!Number.isInteger(index) || index < 0 || typeof text !== "string") return null;
  return customInteraction(interactionId, text, index);
}


/**
 * Construit un paquet Personnalisé à partir du catalogue officiel QSPICY.
 * On ne retient ici que les questions ouvertes des paliers 1–2 : le moteur
 * historique du mode personnalisé ne sait pas encore restituer les options,
 * les réponses croisées ni appliquer le consentement 18+ carte par carte.
 */
export function buildCustomDeck(
  catalog: readonly Interaction[],
  requestedCount: number,
  random: () => number = Math.random,
  categories?: readonly Category[]
): string[] {
  const eligible = catalog.filter(
    (card) => card.level <= 2 && card.kind === "free" && card.prompt.trim().length >= CUSTOM.minChars && (!categories?.length || categories.includes(card.category))
  );
  const pool = [...eligible];
  // Fisher–Yates : chaque partie obtient un ordre aléatoire sans doublon.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const count = Math.max(CUSTOM.min, Math.min(CUSTOM.max, Math.floor(requestedCount) || CUSTOM.min));
  return pool.slice(0, Math.min(count, pool.length)).map((card) => card.prompt.trim());
}

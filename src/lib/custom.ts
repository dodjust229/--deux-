import type { Lang } from "./i18n";
import type { Category, Interaction } from "../types";
export const CUSTOM = { min: 5, max: 24 } as const;
const MESSAGES = {
  fr: { count: `Il faut au moins ${CUSTOM.min} questions (${CUSTOM.max} au maximum).`, empty: "Une question est vide.", tooShort: "Cette question est trop courte.", tooLong: "Cette question est trop longue.", duplicate: "Deux questions sont identiques.", ready: "Prêt à lancer." },
  en: { count: `You need at least ${CUSTOM.min} questions (${CUSTOM.max} at most).`, empty: "A question is empty.", tooShort: "This question is too short.", tooLong: "This question is too long.", duplicate: "Two questions are identical.", ready: "Ready to start." }
} as const;
export type CustomError = keyof typeof MESSAGES["fr"];
export interface CustomCheck { ok: boolean; questions: string[]; errors: CustomError[]; badIndexes: number[]; }
/** Legacy validation retained for rooms created by the previous custom engine. */
export function checkQuestions(raw: readonly string[]): CustomCheck {
  const questions: string[] = [], errors: CustomError[] = [], badIndexes: number[] = [], seen = new Set<string>();
  raw.forEach((line, index) => {
    const value = line.trim(); if (!value) return;
    if (value.length < 5) { errors.push("tooShort"); badIndexes.push(index); return; }
    if (value.length > 280) { errors.push("tooLong"); badIndexes.push(index); return; }
    const key = value.toLocaleLowerCase(); if (seen.has(key)) { errors.push("duplicate"); badIndexes.push(index); return; }
    seen.add(key); questions.push(value);
  });
  if (!errors.length && (questions.length < CUSTOM.min || questions.length > CUSTOM.max)) errors.push("count");
  return { ok: errors.length === 0, questions, errors: [...new Set(errors)], badIndexes };
}
export function customMessage(lang: Lang, error: CustomError): string { return MESSAGES[lang][error]; }
export function explainCustomError(lang: Lang, message: string): string {
  if (/could not find the function|does not exist/i.test(message)) return lang === "fr" ? "Le moteur Personnalisé doit être mis à jour sur le serveur. Réessaie après la mise à jour." : "The Custom engine needs a server update. Please retry after the update.";
  if (!message.includes("E_CUSTOM") && !message.includes("E_CONSENT")) return message;
  if (/24|5 et 24|between 5 and 24/i.test(message)) return customMessage(lang, "count");
  if (/consent/i.test(message)) return lang === "fr" ? "Les deux joueurs doivent accepter le contenu 18+ pour cette sélection." : "Both players must accept 18+ content for this selection.";
  if (/repeat|déjà jouées/i.test(message)) return lang === "fr" ? "Cette sélection contient des questions déjà jouées. Mélange-la à nouveau." : "This selection contains questions already played. Shuffle again.";
  return lang === "fr" ? "Cette sélection ne peut pas être lancée." : "This selection cannot be started.";
}
/** Legacy resolver for sessions already playing with perso-N identifiers. */
export function customInteraction(id: string, text: string, index: number): Interaction {
  return { id, category: "decouverte", kind: "free", title: `Question ${index + 1}`, prompt: text, level: 2, intensity: 2, audience: "partner", visibility: "partagee" };
}
export function resolveCustomInteraction(interactionId: string | null, deck: readonly string[]): Interaction | null {
  if (!interactionId || !interactionId.startsWith("perso-")) return null;
  const index = Number.parseInt(interactionId.slice(6), 10) - 1, prompt = deck[index];
  if (!Number.isInteger(index) || index < 0 || typeof prompt !== "string") return null;
  return customInteraction(interactionId, prompt, index);
}
/** Client preview only; the server independently validates canonical catalog IDs. */
export function buildCustomDeck(catalog: readonly Interaction[], requestedCount: number, random: () => number = Math.random, categories?: readonly Category[]): Interaction[] {
  const pool = catalog.filter(card => (!categories?.length || categories.includes(card.category)) && card.prompt.trim().length >= 5).slice();
  for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1)))); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const count = Math.max(CUSTOM.min, Math.min(CUSTOM.max, Math.floor(requestedCount) || CUSTOM.min));
  return pool.slice(0, Math.min(count, pool.length));
}

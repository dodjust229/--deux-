import type { InteractionKind } from "../types";
import { speakerSeat } from "./protocol.ts";

export type CharacterState =
  | "idle"
  | "listening"
  | "speaking"
  | "thinking"
  | "amused"
  | "surprised"
  | "shy"
  | "reacting"
  | "celebrating";

export interface Scene {
  /** Siège qui mène l'échange, ou null quand personne ne parle. */
  speaker: 1 | 2 | null;
  /** Texte de la bulle, posée près du personnage concerné (jamais au-dessus des contrôles). */
  bubble: string | null;
  bubbleSeat: 1 | 2 | null;
  states: Record<1 | 2, CharacterState>;
}

export interface SceneInput {
  status: "playing" | "paused" | "finished";
  kind: InteractionKind | null;
  index: number;
  mySeat: 1 | 2;
  myAnswer: string | null;
  otherSubmitted: boolean;
  firstDone: boolean;
  prompt: string;
  revealed: boolean;
  otherOnline: boolean;
}

export const BUBBLE_MAX = 150;

/** Extrait lisible pour une bulle : espaces normalisés, coupe propre, pas de HTML. */
export function excerpt(text: string, max = BUBBLE_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const other = (seat: 1 | 2): 1 | 2 => (seat === 1 ? 2 : 1);

/**
 * Traduit l'état réel de la partie en attitudes de personnages.
 * Une seule bouche peut parler à la fois : `speaker` n'est jamais double.
 */
export function deriveScene(input: SceneInput): Scene {
  const seat = input.mySeat;
  const partner = other(seat);

  if (input.status === "finished") {
    return { speaker: null, bubble: null, bubbleSeat: null, states: { 1: "celebrating", 2: "celebrating" } };
  }
  if (input.status === "paused") {
    return { speaker: null, bubble: null, bubbleSeat: null, states: { 1: "idle", 2: "idle" } };
  }

  const active = speakerSeat(input.kind ?? "free", input.index, input.firstDone);

  if (input.revealed) {
    return {
      speaker: active,
      bubble: null,
      bubbleSeat: null,
      states: active === 1 ? { 1: "amused", 2: "reacting" } : { 1: "reacting", 2: "amused" }
    };
  }

  // La personne qui n'a pas encore répondu réfléchit ; l'autre écoute, sans jamais lui couper la parole.
  if (input.myAnswer === null && active === seat) {
    return {
      speaker: seat,
      bubble: excerpt(input.prompt),
      bubbleSeat: seat,
      states: { [seat]: "speaking", [partner]: input.otherOnline ? "listening" : "idle" } as Record<1 | 2, CharacterState>
    };
  }
  if (input.myAnswer === null && active === partner) {
    return {
      speaker: partner,
      bubble: excerpt(input.prompt),
      bubbleSeat: partner,
      states: { [partner]: "speaking", [seat]: "listening" } as Record<1 | 2, CharacterState>
    };
  }
  if (input.myAnswer !== null && !input.otherSubmitted) {
    return {
      speaker: partner,
      bubble: input.otherOnline ? "Je réfléchis…" : "Reconnexion…",
      bubbleSeat: partner,
      states: { [partner]: input.otherOnline ? "thinking" : "idle", [seat]: "listening" } as Record<1 | 2, CharacterState>
    };
  }
  return {
    speaker: null,
    bubble: null,
    bubbleSeat: null,
    states: { 1: "reacting", 2: "reacting" }
  };
}

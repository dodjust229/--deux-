// Fonctions pures (testées dans protocol.test.ts) : codes d'erreur serveur et format des réponses.
export const FATAL_CODES = ["E_ROOM_UNKNOWN","E_ROOM_EXPIRED","E_SESSION","E_REPLACED","E_LEFT"] as const;
export type ServerError = { code: string | null; message: string; fatal: boolean; network: boolean };

export function parseError(raw: unknown): ServerError {
  const text = raw instanceof Error ? raw.message : String(raw ?? "");
  const m = text.match(/^(E_[A-Z_]+):\s*(.*)$/s);
  if (m) return { code: m[1], message: m[2], fatal: (FATAL_CODES as readonly string[]).includes(m[1]), network: false };
  const network = /failed to fetch|network|load failed|fetch/i.test(text);
  return { code: null, message: network ? "Connexion perdue." : text || "Une erreur est survenue.", fatal: false, network };
}
export function encodePrediction(own: string, guess: string) { return JSON.stringify({ own: own.trim(), guess: guess.trim() }); }
export function decodePrediction(raw: string): { own: string; guess: string } | null {
  try { const v = JSON.parse(raw); return typeof v?.own === "string" && typeof v?.guess === "string" ? v : null; } catch { return null; }
}
export function extractRoomId(input: string): string | null {
  const m = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i); return m ? m[0].toLowerCase() : null;
}
/** Qui "parle" : question croisée = joueur 1 puis 2 ; sinon alternance selon l'index. */
export function speakerSeat(kind: string, index: number, firstDone: boolean): 1 | 2 {
  if (kind === "cross") return firstDone ? 2 : 1;
  return index % 2 === 0 ? 1 : 2;
}

/** Centres d'intérêt choisis individuellement par les participants : chaque choix compte. */
export function getSelectedInterests<T extends string>(selected: readonly T[], others?: readonly (readonly T[] | null | undefined)[] | null): T[] {
  return [...new Set([...selected, ...(others ?? []).flatMap(values => values ?? [])])];
}

/** Catégories que les deux joueurs ont sélectionnées. */
export function getSharedCategories<T extends string>(selected: readonly T[], other?: readonly T[] | null): T[] {
  const otherSet = new Set(other ?? []);
  return selected.filter(category => otherSet.has(category));
}

/** Identifie une session sans confondre deux salles ou deux jetons du même appareil. */
export function sessionFingerprint(identity: { roomId: string; token: string; gameMode?: string } | null): string | null {
  if (!identity?.roomId || !identity.token) return null;
  return `${identity.roomId}:${identity.token}:${identity.gameMode ?? "couple"}`;
}

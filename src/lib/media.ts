// Compatibilité de lecture des anciennes réponses.
// Les stickers et GIF maison ont été retirés : seuls le texte, les réponses privées
// et un marqueur de média historique subsistent.
export const CONTENT_PREFIX = "qs1:";
export const MAX_ANSWER_LENGTH = 2000;

/** Réponse gardée sur l'appareil : seule cette marque part vers le serveur. */
export const PRIVATE_ANSWER = "qs1:privee:";
export const PRIVATE_STORAGE_PREFIX = "qspicy.privee.";

export type Content =
  | { kind: "text"; text: string }
  | { kind: "private" }
  | { kind: "legacy"; raw: string }
  | { kind: "invalid"; raw: string };

export const encodeText = (text: string): string => text.trim().slice(0, MAX_ANSWER_LENGTH);

export function parseContent(raw: string | null | undefined): Content {
  const value = (raw ?? "").toString();
  const versioned = value.match(/^qs\d+:/);
  if (!versioned) return { kind: "text", text: value };
  const body = value.slice(versioned[0].length);
  const separator = body.indexOf(":");
  const type = separator === -1 ? body : body.slice(0, separator);
  if (type === "privee") return { kind: "private" };
  if (type === "sticker" || type === "gif") return { kind: "legacy", raw: value };
  return { kind: "invalid", raw: value };
}

/** Libellé lisible d'une réponse, utilisé par les aperçus et les tests. */
export function describeContent(content: Content): string {
  switch (content.kind) {
    case "text":
      return content.text;
    case "private":
      return "Confidence gardée pour soi";
    case "legacy":
      return "Média retiré";
    case "invalid":
      return "Réponse illisible";
  }
}


/** Supprime uniquement les confidences locales liées à une salle quittée. */
export function clearPrivateAnswers(
  roomId: string,
  storage: Pick<Storage, "length" | "key" | "removeItem">
): number {
  const prefix = `${PRIVATE_STORAGE_PREFIX}${roomId}.`;
  let removed = 0;
  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) {
        storage.removeItem(key);
        removed += 1;
      }
    }
  } catch {
    // Le départ de salle ne doit jamais échouer à cause du stockage local.
  }
  return removed;
}

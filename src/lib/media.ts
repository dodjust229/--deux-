// Contenu typé transporté dans le champ `answer` existant (1 à 2000 caractères, aucun changement de schéma).
// Types distincts : texte, sticker statique, GIF animé, contenu illisible (fallback explicite).
export const CONTENT_PREFIX = "qs1:";
export const MAX_ANSWER_LENGTH = 2000;

export const STICKERS = [
  { id: "coeur", label: "Cœur", tone: "pepper" },
  { id: "clin", label: "Clin d'œil", tone: "amber" },
  { id: "rire", label: "Rire", tone: "amber" },
  { id: "piment", label: "Piment", tone: "pepper" },
  { id: "chut", label: "Chut…", tone: "bordeaux" },
  { id: "bravo", label: "Bravo", tone: "copper" },
  { id: "boude", label: "Boude", tone: "bordeaux" },
  { id: "etincelle", label: "Étincelle", tone: "pepper" },
  { id: "susurre", label: "Susurre", tone: "copper" },
  { id: "fou-rire", label: "Fou rire", tone: "amber" }
] as const;

export type StickerId = (typeof STICKERS)[number]["id"];

export type Content =
  | { kind: "text"; text: string }
  | { kind: "sticker"; id: StickerId }
  | { kind: "gif"; url: string }
  | { kind: "invalid"; raw: string };

const GIF_HOSTS = ["media.giphy.com", "i.giphy.com", "media.tenor.com", "c.tenor.com", "i.imgur.com"];
const GIF_EXTENSIONS = [".gif", ".webp", ".png", ".jpg", ".jpeg", ".avif"];

export const isStickerId = (value: string): value is StickerId =>
  STICKERS.some((sticker) => sticker.id === value);

/** N'accepte qu'une URL https d'image ; javascript:, data: et http: sont refusés. */
export function normalizeGifUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const path = url.pathname.toLowerCase();
  const knownHost = GIF_HOSTS.includes(url.hostname.toLowerCase());
  const imagePath = GIF_EXTENSIONS.some((extension) => path.endsWith(extension));
  if (!knownHost && !imagePath) return null;
  return url.toString();
}

export const encodeSticker = (id: StickerId): string => `${CONTENT_PREFIX}sticker:${id}`;

export function encodeGif(input: string): string | null {
  const url = normalizeGifUrl(input);
  return url ? `${CONTENT_PREFIX}gif:${url}` : null;
}

export const encodeText = (text: string): string => text.trim().slice(0, MAX_ANSWER_LENGTH);

export function parseContent(raw: string | null | undefined): Content {
  const value = (raw ?? "").toString();
  // Tout préfixe versionné (qs1:, qs2:…) est un contenu typé : une version inconnue ne doit
  // jamais s'afficher comme du texte brut, mais comme un média illisible (fallback explicite).
  const versioned = value.match(/^qs\d+:/);
  if (!versioned) return { kind: "text", text: value };
  const body = value.slice(versioned[0].length);
  const separator = body.indexOf(":");
  const type = separator === -1 ? body : body.slice(0, separator);
  const payload = separator === -1 ? "" : body.slice(separator + 1);
  if (type === "sticker") {
    return isStickerId(payload) ? { kind: "sticker", id: payload } : { kind: "invalid", raw: value };
  }
  if (type === "gif") {
    const url = normalizeGifUrl(payload);
    return url ? { kind: "gif", url } : { kind: "invalid", raw: value };
  }
  return { kind: "invalid", raw: value };
}

/** Vrai si le contenu doit être envoyé comme média (le champ texte reste vide). */
export const isMedia = (content: Content): boolean =>
  content.kind === "sticker" || content.kind === "gif";

export const stickerLabel = (id: StickerId): string =>
  STICKERS.find((sticker) => sticker.id === id)?.label ?? "Sticker";

/** Libellé lisible d'une réponse, utilisé par les aperçus et les tests. */
export function describeContent(content: Content): string {
  switch (content.kind) {
    case "text":
      return content.text;
    case "sticker":
      return `Sticker « ${stickerLabel(content.id)} »`;
    case "gif":
      return "GIF animé";
    case "invalid":
      return "Média indisponible";
  }
}

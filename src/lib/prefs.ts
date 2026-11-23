// Préférences locales, propres à chaque appareil et à chaque joueur.
// Rien n'est envoyé au serveur : le thème de A ne change jamais celui de B.
import type { Category } from "../types";
import type { Lang } from "./i18n";

export type Theme = "dark" | "light";
export type Intensity = "soft" | "hot" | "veryHot";

export interface Preferences {
  theme: Theme;
  reducedMotion: boolean;
  sound: boolean;
  volume: number;
  language: Lang;
  intensity: Intensity;
  /** Ambiances que la personne ne veut jamais voir apparaître. */
  exclusions: Category[];
}

export const PREFS_KEY = "qspicy.prefs.v1";
export const LEGACY_REDUCED_KEY = "adeux_reduced";

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  reducedMotion: false,
  sound: false,
  volume: 0.4,
  language: "fr",
  intensity: "hot",
  exclusions: []
};

const CATEGORIES: Category[] = ["decouverte", "complicite", "profondeur", "seduction", "audacieux"];

/** Catégories proposées par défaut selon l'intensité choisie, exclusions retirées. */
export function categoriesForIntensity(intensity: Intensity, exclusions: Category[] = []): Category[] {
  const base: Record<Intensity, Category[]> = {
    soft: ["decouverte", "complicite"],
    hot: ["decouverte", "complicite", "profondeur", "seduction"],
    veryHot: ["decouverte", "complicite", "profondeur", "seduction", "audacieux"]
  };
  return base[intensity].filter((category) => !exclusions.includes(category));
}

export function clampVolume(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PREFERENCES.volume;
  return Math.min(1, Math.max(0, Math.round(n * 100) / 100));
}

/** Accepte n'importe quelle valeur stockée (ancienne version, JSON corrompu) sans jamais planter. */
export function sanitizePreferences(raw: unknown): Preferences {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const exclusions = Array.isArray(source.exclusions)
    ? (source.exclusions.filter((value): value is Category => CATEGORIES.includes(value as Category)))
    : [];
  return {
    theme: source.theme === "light" ? "light" : "dark",
    reducedMotion: source.reducedMotion === true,
    sound: source.sound === true,
    volume: clampVolume(source.volume),
    language: source.language === "en" ? "en" : "fr",
    intensity: source.intensity === "soft" || source.intensity === "veryHot" ? source.intensity : "hot",
    exclusions: [...new Set(exclusions)]
  };
}

/** Lit les préférences ; reprend l'ancien réglage « réduire les animations » s'il existe. */
export function readPreferences(storage: Pick<Storage, "getItem"> | null): Preferences {
  if (!storage) return { ...DEFAULT_PREFERENCES };
  try {
    const stored = storage.getItem(PREFS_KEY);
    if (stored) return sanitizePreferences(JSON.parse(stored));
    const legacy = storage.getItem(LEGACY_REDUCED_KEY);
    if (legacy === "1") return { ...DEFAULT_PREFERENCES, reducedMotion: true };
  } catch {
    /* stockage indisponible ou JSON invalide : on repart des valeurs par défaut */
  }
  return { ...DEFAULT_PREFERENCES };
}

export function writePreferences(storage: Pick<Storage, "setItem"> | null, prefs: Preferences): void {
  if (!storage) return;
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* mode privé plein : la partie continue sans mémoriser les préférences */
  }
}

/** Applique thème et réduction de mouvement sur <html> (les deux sont indépendants du thème). */
export function applyPreferences(root: HTMLElement, prefs: Preferences): void {
  root.dataset.theme = prefs.theme;
  root.dataset.motion = prefs.reducedMotion ? "reduced" : "full";
  root.style.colorScheme = prefs.theme;
}

export function prefersReducedMotion(query: Pick<MediaQueryList, "matches"> | null): boolean {
  return Boolean(query?.matches);
}

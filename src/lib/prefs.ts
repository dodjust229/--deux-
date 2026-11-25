// Préférences locales, propres à chaque appareil et à chaque joueur.
// Rien n'est envoyé au serveur : le thème de A ne change jamais celui de B.
import type { Category } from "../types";
import type { Lang } from "./i18n";

export type Theme = "dark" | "light";
export type Intensity = "soft" | "audacious" | "all";
export type GameLevel = 1 | 2 | 3 | 4;
export type Ambience = "off" | "lounge" | "velvet" | "rain";

export interface Preferences {
  theme: Theme;
  reducedMotion: boolean;
  sound: boolean;
  volume: number;
  ambience: Ambience;
  language: Lang;
  intensity: Intensity;
  /** Palier exact joué pendant la partie (indépendant des catégories). */
  gameLevel: GameLevel;
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
  ambience: "off",
  language: "fr",
  intensity: "soft",
  gameLevel: 2,
  exclusions: []
};

export const ALL_CATEGORIES: Category[] = ["decouverte", "complicite", "profondeur", "seduction", "audacieux"];

export function categoriesForIntensity(intensity: Intensity, exclusions: Category[] = []): Category[] {
  const base: Record<Intensity, Category[]> = {
    soft: ["decouverte", "complicite", "profondeur", "seduction"],
    audacious: ["audacieux"],
    all: ALL_CATEGORIES
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
  // Les anciennes exclusions individuelles sont abandonnées au profit des trois choix
  // simples : Douce, Audacieux ou Toutes.
  const intensity: Intensity = source.intensity === "audacious"
    ? "audacious"
    : source.intensity === "all" || source.intensity === "veryHot"
      ? "all"
      : "soft";
  const ambience: Ambience = source.ambience === "lounge" || source.ambience === "velvet" || source.ambience === "rain"
    ? source.ambience
    : "off";
  return {
    theme: source.theme === "light" ? "light" : "dark",
    reducedMotion: source.reducedMotion === true,
    sound: source.sound === true,
    volume: clampVolume(source.volume),
    ambience,
    language: source.language === "en" ? "en" : "fr",
    intensity,
    // Le palier technique n'est plus un choix joueur. Le moteur le déduit du contenu servi.
    gameLevel: 2,
    exclusions: []
  };
}

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

export function applyPreferences(root: HTMLElement, prefs: Preferences): void {
  root.dataset.theme = prefs.theme;
  root.dataset.motion = prefs.reducedMotion ? "reduced" : "full";
  root.style.colorScheme = prefs.theme;
}

export function prefersReducedMotion(query: Pick<MediaQueryList, "matches"> | null): boolean {
  return Boolean(query?.matches);
}

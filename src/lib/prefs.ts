// Préférences locales, propres à chaque appareil et à chaque joueur.
// Rien n'est envoyé au serveur : le thème de A ne change jamais celui de B.
export type Theme = "dark" | "light";

export interface Preferences {
  theme: Theme;
  reducedMotion: boolean;
  sound: boolean;
  volume: number;
}

export const PREFS_KEY = "qspicy.prefs.v1";
export const LEGACY_REDUCED_KEY = "adeux_reduced";

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  reducedMotion: false,
  sound: false,
  volume: 0.4
};

export function clampVolume(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PREFERENCES.volume;
  return Math.min(1, Math.max(0, Math.round(n * 100) / 100));
}

/** Accepte n'importe quelle valeur stockée (ancienne version, JSON corrompu) sans jamais planter. */
export function sanitizePreferences(raw: unknown): Preferences {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    theme: source.theme === "light" ? "light" : "dark",
    reducedMotion: source.reducedMotion === true,
    sound: source.sound === true,
    volume: clampVolume(source.volume)
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

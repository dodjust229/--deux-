import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PREFERENCES, LEGACY_REDUCED_KEY, PREFS_KEY, categoriesForIntensity,
  clampVolume, readPreferences, sanitizePreferences, writePreferences
} from "./prefs.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => void data.set(key, value),
    dump: () => Object.fromEntries(data)
  };
}

test("préférences : valeurs par défaut sans stockage", () => {
  assert.deepEqual(readPreferences(null), DEFAULT_PREFERENCES);
  assert.deepEqual(readPreferences(memoryStorage()), DEFAULT_PREFERENCES);
  assert.equal(DEFAULT_PREFERENCES.intensity, "soft");
});

test("préférences : ancien réglage de réduction des animations repris", () => {
  assert.equal(readPreferences(memoryStorage({ [LEGACY_REDUCED_KEY]: "1" })).reducedMotion, true);
  assert.equal(readPreferences(memoryStorage({ [LEGACY_REDUCED_KEY]: "0" })).reducedMotion, false);
});

test("préférences : anciennes intensités migrées vers Douce, Audacieux ou Toutes", () => {
  assert.equal(sanitizePreferences({ intensity: "hot" }).intensity, "soft");
  assert.equal(sanitizePreferences({ intensity: "soft" }).intensity, "soft");
  assert.equal(sanitizePreferences({ intensity: "veryHot" }).intensity, "all");
  assert.equal(sanitizePreferences({ intensity: "audacious" }).intensity, "audacious");
  assert.equal(sanitizePreferences({ intensity: "all" }).intensity, "all");
});

test("préférences : choix d'ambiance filtre exactement les catégories attendues", () => {
  assert.deepEqual(categoriesForIntensity("soft"), ["decouverte", "complicite", "profondeur", "seduction"]);
  assert.deepEqual(categoriesForIntensity("audacious"), ["audacieux"]);
  assert.deepEqual(categoriesForIntensity("all"), ["decouverte", "complicite", "profondeur", "seduction", "audacieux"]);
});

test("préférences : données invalides et anciens paliers ne réintroduisent pas les choix supprimés", () => {
  assert.deepEqual(readPreferences(memoryStorage({ [PREFS_KEY]: "{oups" })), DEFAULT_PREFERENCES);
  const sanitized = sanitizePreferences({
    theme: "neon", reducedMotion: "oui", sound: 1, volume: 4, language: "de",
    intensity: "extreme", gameLevel: 4, exclusions: ["seduction", "inconnue"], ambience: "ultrasonic"
  });
  assert.equal(sanitized.theme, "dark");
  assert.equal(sanitized.reducedMotion, false);
  assert.equal(sanitized.sound, false);
  assert.equal(sanitized.volume, 1);
  assert.equal(sanitized.ambience, "off");
  assert.equal(sanitized.language, "fr");
  assert.equal(sanitized.intensity, "soft");
  assert.equal(sanitized.gameLevel, 2);
  assert.deepEqual(sanitized.exclusions, []);
  assert.equal(sanitizePreferences({ gameLevel: 1 }).gameLevel, 2);
  assert.equal(sanitizePreferences({ gameLevel: 3 }).gameLevel, 2);
  assert.equal(sanitizePreferences({ gameLevel: 4 }).gameLevel, 2);
  assert.equal(sanitizePreferences({ ambience: "rain" }).ambience, "rain");
  assert.equal(clampVolume(-2), 0);
  assert.equal(clampVolume("0.42"), 0.42);
});

test("préférences : écriture puis relecture, thème indépendant par appareil", () => {
  const a = memoryStorage();
  const b = memoryStorage();
  writePreferences(a, { ...DEFAULT_PREFERENCES, theme: "light", volume: 0.3, ambience: "velvet" });
  assert.equal(readPreferences(a).theme, "light");
  assert.equal(readPreferences(a).ambience, "velvet");
  assert.equal(readPreferences(b).theme, "dark");
  assert.equal(readPreferences(b).ambience, "off");
});

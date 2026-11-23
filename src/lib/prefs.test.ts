import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PREFERENCES,
  LEGACY_REDUCED_KEY,
  PREFS_KEY,
  clampVolume,
  readPreferences,
  sanitizePreferences,
  writePreferences
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
});

test("préférences : ancien réglage de réduction des animations repris", () => {
  assert.equal(readPreferences(memoryStorage({ [LEGACY_REDUCED_KEY]: "1" })).reducedMotion, true);
  assert.equal(readPreferences(memoryStorage({ [LEGACY_REDUCED_KEY]: "0" })).reducedMotion, false);
});

test("préférences : JSON corrompu ou valeurs invalides ne cassent rien", () => {
  assert.deepEqual(readPreferences(memoryStorage({ [PREFS_KEY]: "{oups" })), DEFAULT_PREFERENCES);
  const sanitized = sanitizePreferences({ theme: "neon", reducedMotion: "oui", sound: 1, volume: 4 });
  assert.equal(sanitized.theme, "dark");
  assert.equal(sanitized.reducedMotion, false);
  assert.equal(sanitized.sound, false);
  assert.equal(sanitized.volume, 1);
  assert.equal(clampVolume(-2), 0);
  assert.equal(clampVolume("0.42"), 0.42);
});

test("préférences : écriture puis relecture, thème indépendant par appareil", () => {
  const a = memoryStorage();
  const b = memoryStorage();
  writePreferences(a, { ...DEFAULT_PREFERENCES, theme: "light", volume: 0.3 });
  assert.equal(readPreferences(a).theme, "light");
  assert.equal(readPreferences(b).theme, "dark", "l'autre appareil ne doit pas hériter du thème");
});

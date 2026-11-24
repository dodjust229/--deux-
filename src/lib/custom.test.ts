import test from "node:test";
import assert from "node:assert/strict";
import { CUSTOM, buildCustomDeck, checkQuestions, customInteraction, explainCustomError, resolveCustomInteraction } from "./custom.ts";
const valid = ["Une question valable ?", "Une autre question valable ?", "Encore une question ?", "Question numéro quatre ?", "Question numéro cinq ?"];
test("legacy custom question validation remains available", () => {
  assert.equal(checkQuestions(valid).ok, true);
  assert.deepEqual(checkQuestions(valid.slice(0, 4)).errors, ["count"]);
  assert.deepEqual(checkQuestions([...valid, "une question valable ?"]).errors, ["duplicate"]);
});
test("legacy perso-N sessions remain resolvable", () => {
  const interaction = resolveCustomInteraction("perso-2", ["Première question ?", "Deuxième question ?"]);
  assert.equal(interaction?.prompt, "Deuxième question ?");
  assert.equal(interaction?.kind, "free");
  assert.equal(resolveCustomInteraction("d01", ["Une question ?"]), null);
  assert.equal(resolveCustomInteraction("perso-9", ["Une question ?"]), null);
});
test("custom selection includes every official format and intensity", () => {
  const catalog = [
    { id: "a", category: "decouverte", level: 1, kind: "free", prompt: "Question ouverte numéro un ?" },
    { id: "b", category: "decouverte", level: 2, kind: "secret", prompt: "Question à choix numéro deux ?", options: ["A", "B"] },
    { id: "c", category: "decouverte", level: 3, kind: "prediction", prompt: "Prédiction numéro trois ?" },
    { id: "d", category: "decouverte", level: 4, kind: "challenge", prompt: "Défi numéro quatre ?" },
    { id: "e", category: "decouverte", level: 2, kind: "cross", prompt: "Question croisée numéro cinq ?" }
  ] as any;
  const deck = buildCustomDeck(catalog, 5, () => 0, ["decouverte"]);
  assert.deepEqual(new Set(deck.map(card => card.id)), new Set(["a", "b", "c", "d", "e"]));
  assert.deepEqual(new Set(deck.map(card => card.kind)), new Set(["free", "secret", "prediction", "challenge", "cross"]));
  assert.ok(deck.some(card => card.level >= 3));
});
test("custom selection respects shared categories", () => {
  const catalog = [
    { id: "a", category: "decouverte", level: 1, kind: "free", prompt: "Question découverte numéro un ?" },
    { id: "b", category: "seduction", level: 2, kind: "secret", prompt: "Question séduction numéro deux ?" }
  ] as any;
  assert.deepEqual(buildCustomDeck(catalog, 5, () => 0, ["seduction"]).map(card => card.id), ["b"]);
});
test("custom selection is capped and never duplicates IDs", () => {
  const catalog = Array.from({ length: 30 }, (_, i) => ({ id: String(i), category: "decouverte", level: 1, kind: "free", prompt: `Question ouverte numéro ${i} ?` })) as any;
  const deck = buildCustomDeck(catalog, 99, () => 0.5);
  assert.equal(deck.length, CUSTOM.max);
  assert.equal(new Set(deck.map(card => card.id)).size, CUSTOM.max);
});
test("adult consent errors are explained in French and English", () => {
  assert.match(explainCustomError("fr", "E_CONSENT: consent required"), /deux joueurs/);
  assert.match(explainCustomError("en", "E_CONSENT: consent required"), /Both players/);
});
test("legacy custom interaction remains available", () => {
  assert.equal(customInteraction("perso-1", "Une question ?", 0).title, "Question 1");
});

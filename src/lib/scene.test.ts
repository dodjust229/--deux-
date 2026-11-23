import test from "node:test";
import assert from "node:assert/strict";
import { BUBBLE_MAX, deriveScene, excerpt, type SceneInput } from "./scene.ts";

const base: SceneInput = {
  status: "playing",
  kind: "free",
  index: 0,
  mySeat: 1,
  myAnswer: null,
  otherSubmitted: false,
  firstDone: false,
  prompt: "Quel petit détail te fait sourire chez quelqu'un ?",
  revealed: false,
  otherOnline: true
};

test("bulle : le personnage actif pose la question, l'autre écoute", () => {
  const scene = deriveScene(base);
  assert.equal(scene.speaker, 1);
  assert.equal(scene.bubbleSeat, 1);
  assert.equal(scene.states[1], "speaking");
  assert.equal(scene.states[2], "listening");
  assert.equal(scene.bubble, base.prompt);
});

test("jamais deux personnages qui parlent en même temps", () => {
  const cases: SceneInput[] = [
    base,
    { ...base, mySeat: 2 },
    { ...base, myAnswer: "ma réponse" },
    { ...base, index: 3 },
    { ...base, kind: "cross", firstDone: true },
    { ...base, kind: "cross", firstDone: false },
    { ...base, revealed: true },
    { ...base, status: "paused" }
  ];
  for (const input of cases) {
    const states = Object.values(deriveScene(input).states);
    assert.ok(states.filter((state) => state === "speaking").length <= 1, JSON.stringify(input));
  }
});

test("révélation : plus personne ne pose de question, les deux réagissent", () => {
  const scene = deriveScene({ ...base, revealed: true });
  assert.equal(scene.bubble, null);
  assert.ok(Object.values(scene.states).every((state) => state === "reacting" || state === "amused"));
});

test("attente de l'autre : bulle « Je réfléchis… », pas de question en double", () => {
  const scene = deriveScene({ ...base, myAnswer: "répondu" });
  assert.equal(scene.states[2], "thinking");
  assert.equal(scene.bubble, "Je réfléchis…");
  const offline = deriveScene({ ...base, myAnswer: "répondu", otherOnline: false });
  assert.equal(offline.bubble, "Reconnexion…");
});

test("question croisée : le siège 2 prend la parole une fois la réponse du premier là", () => {
  const scene = deriveScene({ ...base, kind: "cross", mySeat: 2, firstDone: true });
  assert.equal(scene.speaker, 2);
  assert.equal(scene.bubbleSeat, 2);
});

test("pause et fin : aucune parole, états cohérents", () => {
  const paused = deriveScene({ ...base, status: "paused" });
  assert.equal(paused.speaker, null);
  assert.equal(paused.bubble, null);
  assert.deepEqual(paused.states, { 1: "idle", 2: "idle" });
  const finished = deriveScene({ ...base, status: "finished" });
  assert.deepEqual(finished.states, { 1: "celebrating", 2: "celebrating" });
});

test("extrait de bulle : espaces normalisés, coupe sur un mot, longueur bornée", () => {
  assert.equal(excerpt("  deux   mots  "), "deux mots");
  const long = excerpt(`${"mot ".repeat(80)}fin`);
  assert.ok(long.length <= BUBBLE_MAX + 1);
  assert.ok(long.endsWith("…"));
});

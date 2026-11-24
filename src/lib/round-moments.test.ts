import test from "node:test";
import assert from "node:assert/strict";
import { getRoundMoments } from "./round-moments.ts";

const base = { id: "card-17", category: "seduction" as const, kind: "free" as const, visibility: "partagee" as const };

test("returns three distinct optional follow-up moments in a stable order", () => {
  const first = getRoundMoments(base);
  assert.deepEqual(first, getRoundMoments(base));
  assert.deepEqual(first.map((item) => item.id), ["deepen", "reverse", "play"]);
  assert.equal(new Set(first.map((item) => item.title)).size, 3);
  assert.ok(first.every((item) => item.prompt.length > 20));
});

test("private answers never invite a player to reveal the secret", () => {
  const [deepen] = getRoundMoments({ ...base, visibility: "privee" });
  assert.match(deepen.prompt, /Sans demander le contenu/);
});

test("prediction cards get a reveal-specific reverse prompt", () => {
  const [, reverse] = getRoundMoments({ ...base, kind: "prediction" });
  assert.equal(reverse.title, "Le pronostic");
  assert.match(reverse.prompt, /indice/);
});

test("adult category keeps the follow-up optional and consent-led", () => {
  const [, , play] = getRoundMoments({ ...base, category: "audacieux" });
  assert.match(play.prompt, /refuser librement/);
});

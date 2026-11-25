import test from "node:test";
import assert from "node:assert/strict";
import { applyServerOptions } from "./snapshot-options.ts";
import type { Interaction } from "../types.ts";

const secret: Interaction = {
  id: "p03",
  category: "profondeur",
  kind: "secret",
  title: "Choix secret",
  prompt: "Choisis une option 🔥",
  options: ["Ancienne option A", "Ancienne option B"],
  level: 3,
  audience: "partner",
  visibility: "partagee"
};

test("les options QCM du serveur remplacent la copie locale", () => {
  const canonical = ["Option serveur 1", "Option serveur 2", "Option serveur 3", "Option serveur 4"];
  const result = applyServerOptions(secret, canonical);
  assert.deepEqual(result?.options, canonical);
  assert.equal(result?.id, secret.id);
  assert.equal(result?.prompt, secret.prompt);
});

test("une réponse QCM sans options serveur n'affiche pas de faux choix locaux", () => {
  const result = applyServerOptions(secret, null);
  assert.deepEqual(result?.options, []);
});

test("les autres types de cartes conservent leur interaction locale", () => {
  const free = { ...secret, kind: "free" as const, options: undefined };
  assert.equal(applyServerOptions(free, ["ignored"]), free);
});

test("un snapshot sans interaction reste sans interaction", () => {
  assert.equal(applyServerOptions(null, ["option"]), null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { MAX_ANSWER_LENGTH, PRIVATE_ANSWER, describeContent, encodeText, parseContent } from "./media.ts";

test("texte : compatible tel quel", () => {
  assert.deepEqual(parseContent("Une réponse normale"), { kind: "text", text: "Une réponse normale" });
  assert.equal(parseContent(null).kind, "text");
});

test("confidence privée : marque dédiée", () => {
  assert.deepEqual(parseContent(PRIVATE_ANSWER), { kind: "private" });
  assert.equal(describeContent(parseContent(PRIVATE_ANSWER)), "Confidence gardée pour soi");
});

test("médias retirés : les anciens stickers et GIF ne cassent rien", () => {
  assert.deepEqual(parseContent("qs1:sticker:coeur"), { kind: "legacy", raw: "qs1:sticker:coeur" });
  assert.deepEqual(parseContent("qs1:gif:https://exemple.fr/a.gif"), { kind: "legacy", raw: "qs1:gif:https://exemple.fr/a.gif" });
  assert.equal(describeContent(parseContent("qs1:sticker:coeur")), "Média retiré");
});

test("préfixe inconnu : réponse illisible, jamais affichée comme du texte brut", () => {
  assert.equal(parseContent("qs2:autre:chose").kind, "invalid");
  assert.equal(describeContent(parseContent("qs2:autre:chose")), "Réponse illisible");
});

test("longueur maximale alignée sur la contrainte serveur (2000)", () => {
  assert.equal(MAX_ANSWER_LENGTH, 2000);
  assert.equal(encodeText("  court  "), "court");
  assert.equal(encodeText("x".repeat(2500)).length, MAX_ANSWER_LENGTH);
});

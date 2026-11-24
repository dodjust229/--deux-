import test from "node:test";
import assert from "node:assert/strict";
import { MAX_ANSWER_LENGTH, PRIVATE_ANSWER, PRIVATE_STORAGE_PREFIX, clearPrivateAnswers, describeContent, encodeText, parseContent } from "./media.ts";

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


test("nettoyage de confidentialité : supprime seulement les confidences de la salle quittée", () => {
  const values = new Map<string, string>([
    [`${PRIVATE_STORAGE_PREFIX}room-a.q01`, "secret A"],
    [`${PRIVATE_STORAGE_PREFIX}room-a.q02`, "secret B"],
    [`${PRIVATE_STORAGE_PREFIX}room-b.q01`, "secret autre salle"],
    ["adeux_identity", "session"]
  ]);
  const storage = {
    get length() { return values.size; },
    key(index: number) { return Array.from(values.keys())[index] ?? null; },
    removeItem(key: string) { values.delete(key); }
  };
  assert.equal(clearPrivateAnswers("room-a", storage), 2);
  assert.equal(values.has(`${PRIVATE_STORAGE_PREFIX}room-a.q01`), false);
  assert.equal(values.has(`${PRIVATE_STORAGE_PREFIX}room-a.q02`), false);
  assert.equal(values.get(`${PRIVATE_STORAGE_PREFIX}room-b.q01`), "secret autre salle");
  assert.equal(values.get("adeux_identity"), "session");
});

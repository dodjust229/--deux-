import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ANSWER_LENGTH,
  STICKERS,
  encodeGif,
  encodeSticker,
  encodeText,
  isMedia,
  normalizeGifUrl,
  parseContent
} from "./media.ts";

test("sticker : encodage, décodage et type distinct du texte", () => {
  const raw = encodeSticker("coeur");
  assert.deepEqual(parseContent(raw), { kind: "sticker", id: "coeur" });
  assert.equal(isMedia(parseContent(raw)), true);
});

test("sticker inconnu : contenu illisible plutôt que texte brut", () => {
  assert.deepEqual(parseContent("qs1:sticker:licorne"), { kind: "invalid", raw: "qs1:sticker:licorne" });
});

test("GIF : seules les URL https d'image passent", () => {
  assert.equal(normalizeGifUrl("https://media.giphy.com/media/abc/giphy.gif"), "https://media.giphy.com/media/abc/giphy.gif");
  assert.equal(normalizeGifUrl("https://exemple.fr/image.webp"), "https://exemple.fr/image.webp");
  assert.equal(normalizeGifUrl("http://exemple.fr/image.gif"), null);
  assert.equal(normalizeGifUrl("javascript:alert(1)"), null);
  assert.equal(normalizeGifUrl("https://exemple.fr/page"), null);
  assert.equal(encodeGif("javascript:alert(1)"), null);
  assert.deepEqual(parseContent("qs1:gif:http://interdit.fr/x.gif"), { kind: "invalid", raw: "qs1:gif:http://interdit.fr/x.gif" });
});

test("texte existant : compatible tel quel, jamais transformé en média", () => {
  assert.deepEqual(parseContent("Une réponse normale"), { kind: "text", text: "Une réponse normale" });
  assert.deepEqual(parseContent("qs2:autre:chose"), { kind: "invalid", raw: "qs2:autre:chose" });
  assert.equal(parseContent(null).kind, "text");
  assert.equal(isMedia(parseContent("simple texte")), false);
});

test("longueur maximale alignée sur la contrainte serveur (2000)", () => {
  assert.equal(MAX_ANSWER_LENGTH, 2000);
  assert.equal(encodeText("  court  "), "court");
  assert.equal(encodeText("x".repeat(2500)).length, MAX_ANSWER_LENGTH);
  assert.ok(STICKERS.every((sticker) => /^[a-z-]+$/.test(sticker.id)));
  assert.equal(new Set(STICKERS.map((sticker) => sticker.id)).size, STICKERS.length);
});

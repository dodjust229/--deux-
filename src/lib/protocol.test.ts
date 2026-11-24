import test from "node:test"; import assert from "node:assert/strict";
import { parseError, encodePrediction, decodePrediction, extractRoomId, speakerSeat, getSharedCategories, getSelectedInterests, sessionFingerprint } from "./protocol.ts";
test("erreurs serveur fatales vs transitoires", () => {
  assert.equal(parseError(new Error("E_REPLACED: Ta place a été reprise.")).fatal, true);
  assert.equal(parseError(new Error("E_ROOM_FULL: Salle complète.")).fatal, false);
  assert.equal(parseError(new TypeError("Failed to fetch")).network, true);
  assert.equal(parseError(new Error("Pseudo : 2 à 20 caractères.")).code, null);
});
test("prédiction : aller-retour et entrée invalide", () => {
  assert.deepEqual(decodePrediction(encodePrediction(" a ", "b ")), { own: "a", guess: "b" });
  assert.equal(decodePrediction("texte libre"), null);
});
test("identifiant de salle extrait d'un lien", () => {
  assert.equal(extractRoomId("https://x.app/?room=0F8B3C3E-1111-4222-8333-444455556666"), "0f8b3c3e-1111-4222-8333-444455556666");
  assert.equal(extractRoomId("bidon"), null);
});
test("orateur", () => { assert.equal(speakerSeat("cross", 3, false), 1); assert.equal(speakerSeat("cross", 3, true), 2); assert.equal(speakerSeat("free", 1, false), 2); });

test("catégories communes : intersection stricte des deux choix", () => {
  assert.deepEqual(getSharedCategories(["decouverte", "audacieux"], ["decouverte", "profondeur"]), ["decouverte"]);
  assert.deepEqual(getSharedCategories(["decouverte"], ["profondeur"]), []);
  assert.deepEqual(getSharedCategories(["decouverte"], null), []);
});

test("les centres d'intérêt individuels sont réunis sans exiger un choix commun", () => {
  assert.deepEqual(getSelectedInterests(["decouverte"], [["seduction"], ["profondeur"], ["decouverte"]]), ["decouverte", "seduction", "profondeur"]);
  assert.deepEqual(getSelectedInterests([], [[], null]), []);
});

test("session fingerprint: isole les salles, jetons et modes sans dépendre de l'objet", () => {
  const first = { roomId: "room-a", token: "token-a", gameMode: "couple" };
  assert.equal(sessionFingerprint(first), sessionFingerprint({ ...first }));
  assert.notEqual(sessionFingerprint(first), sessionFingerprint({ ...first, roomId: "room-b" }));
  assert.notEqual(sessionFingerprint(first), sessionFingerprint({ ...first, token: "token-b" }));
  assert.notEqual(sessionFingerprint(first), sessionFingerprint({ ...first, gameMode: "duos" }));
  assert.equal(sessionFingerprint(null), null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { CUSTOM, buildCustomDeck, checkQuestions, customInteraction, explainCustomError, resolveCustomInteraction } from "./custom.ts";

const valid = [
  "Quel souvenir te fait encore sourire ?",
  "Qu’est-ce qui te rassure quand tu doutes ?",
  "Un geste qui te touche toujours",
  "Ce que tu n’oses pas demander",
  "Ta dernière fierté"
];

test("personnalisé : une liste valide passe et garde l’ordre écrit", () => {
  const check = checkQuestions(valid);
  assert.equal(check.ok, true);
  assert.deepEqual(check.questions, valid);
  assert.deepEqual(check.errors, []);
});

test("personnalisé : moins de 5 questions est refusé", () => {
  const check = checkQuestions(valid.slice(0, 4));
  assert.equal(check.ok, false);
  assert.deepEqual(check.errors, ["count"]);
});

test("personnalisé : plus de 24 questions est refusé", () => {
  const many = Array.from({ length: 25 }, (_, i) => `Question numéro ${i + 1} ?`);
  assert.deepEqual(checkQuestions(many).errors, ["count"]);
});

test("personnalisé : les lignes vides sont ignorées et ne comptent pas", () => {
  const check = checkQuestions([...valid, "   ", ""]);
  assert.equal(check.ok, true);
  assert.equal(check.questions.length, CUSTOM.min);
});

test("personnalisé : question trop courte signalée avec sa position", () => {
  const check = checkQuestions([...valid.slice(0, 4), "Ok."]);
  assert.deepEqual(check.errors, ["tooShort"]);
  assert.deepEqual(check.badIndexes, [4]);
});

test("personnalisé : question trop longue refusée", () => {
  const check = checkQuestions([...valid.slice(0, 4), "x".repeat(CUSTOM.maxChars + 1)]);
  assert.deepEqual(check.errors, ["tooLong"]);
});

test("personnalisé : doublons détectés sans tenir compte de la casse", () => {
  const check = checkQuestions([...valid.slice(0, 4), "  quel souvenir te fait ENCORE sourire ?  "]);
  assert.equal(check.ok, false);
  assert.ok(check.errors.includes("duplicate"));
});

test("personnalisé : espaces retirés avant l’envoi", () => {
  const check = checkQuestions([...valid.slice(0, 4), "   Une question espacée ?   "]);
  assert.equal(check.questions[4], "Une question espacée ?");
});

test("personnalisé : la carte courante est relue depuis la liste de la salle", () => {
  const interaction = resolveCustomInteraction("perso-2", ["Première question ?", "Deuxième question ?"]);
  assert.equal(interaction?.prompt, "Deuxième question ?");
  assert.equal(interaction?.kind, "free");
  assert.equal(interaction?.category, "decouverte");
});

test("personnalisé : un identifiant de catalogue n’est jamais résolu comme une question", () => {
  assert.equal(resolveCustomInteraction("d01", ["Une question ?"]), null);
});

test("personnalisé : index absent ou invalide renvoie null", () => {
  assert.equal(resolveCustomInteraction("perso-9", ["Une question ?"]), null);
  assert.equal(resolveCustomInteraction("perso-x", ["Une question ?"]), null);
  assert.equal(resolveCustomInteraction(null, []), null);
});

test("personnalisé : les cartes sont numérotées dans l’ordre", () => {
  assert.equal(customInteraction("perso-1", "Une question ?", 0).title, "Question 1");
  assert.equal(customInteraction("perso-3", "Une question ?", 2).title, "Question 3");
});

test("personnalisé : les refus du serveur sont traduits, dans la langue de l’écran", () => {
  assert.match(explainCustomError("fr", "E_CUSTOM: Il faut entre 5 et 24 questions."), /5/);
  assert.match(explainCustomError("en", "E_CUSTOM: Il faut entre 5 et 24 questions."), /at least 5/);
  assert.equal(explainCustomError("fr", "E_CUSTOM: Deux questions identiques."), "Deux questions sont identiques.");
});

test("personnalisé : une fonction serveur absente est expliquée sans jargon", () => {
  const raw = "Could not find the function public.start_custom_game(p_player_token, p_questions, p_room_id) in the schema cache";
  assert.match(explainCustomError("fr", raw), /pas encore ouvert/);
  assert.match(explainCustomError("en", raw), /not open/);
});

test("personnalisé : les autres erreurs ne sont pas déformées", () => {
  assert.equal(explainCustomError("fr", "E_STATE: Deux joueurs doivent être présents."), "E_STATE: Deux joueurs doivent être présents.");
});


test("personnalisé : le paquet provient du catalogue et exclut les paliers 3–4", () => {
  const catalog = [
    { id: "a", level: 1, kind: "free", prompt: "Question ouverte numéro un ?" },
    { id: "b", level: 2, kind: "free", prompt: "Question ouverte numéro deux ?" },
    { id: "c", level: 3, kind: "free", prompt: "Question adulte à exclure ?" },
    { id: "d", level: 1, kind: "secret", prompt: "Question à choix à exclure ?" }
  ] as any;
  const deck = buildCustomDeck(catalog, 5, () => 0);
  assert.deepEqual(deck.sort(), [
    "Question ouverte numéro deux ?",
    "Question ouverte numéro un ?"
  ].sort());
});

test("personnalisé : le paquet respecte les catégories communes", () => {
  const catalog = [
    { id: "a", category: "decouverte", level: 1, kind: "free", prompt: "Question découverte numéro un ?" },
    { id: "b", category: "seduction", level: 2, kind: "free", prompt: "Question séduction numéro deux ?" }
  ] as any;
  assert.deepEqual(buildCustomDeck(catalog, 5, () => 0, ["seduction"]), ["Question séduction numéro deux ?"]);
});

test("personnalisé : le paquet est limité à 24 et ne contient aucun doublon", () => {
  const catalog = Array.from({ length: 30 }, (_, i) => ({
    id: String(i), level: 1, kind: "free", prompt: `Question ouverte numéro ${i} ?`
  })) as any;
  const deck = buildCustomDeck(catalog, 99, () => 0.5);
  assert.equal(deck.length, 24);
  assert.equal(new Set(deck).size, 24);
});

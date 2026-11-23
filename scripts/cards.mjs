// Valide le catalogue pilote QSPICY et génère son CSV de relecture.
// Usage : node scripts/cards.mjs [--check | --csv]
import fs from "node:fs";
import path from "node:path";

const JSON_PATH = "content/pilot/qspicy-pilot.json";
const CSV_PATH = "content/pilot/qspicy-pilot.csv";

const FIELDS = [
  "id", "text", "type", "audience", "level", "category", "context", "modes",
  "intensity", "emoji", "duration", "visibility", "skip_allowed", "consent_note"
];
const TYPES = [
  "QUESTION", "PRISE_DE_POSITION", "ACTION_GESTE", "POSTURE", "DESCRIPTION",
  "SCENARIO", "PROVOCATION", "DUEL_MIROIR", "SURPRISE", "CONFIDENCE"
];
const AUDIENCES = ["partner", "own_duo", "other_duo", "all_players", "individual_choice"];
const INTIMATE_AUDIENCES = ["partner", "own_duo", "individual_choice"];
const GROUP_AUDIENCES = ["other_duo", "all_players"];
const CATEGORIES = [
  "seduction", "humour", "premieres-impressions", "confiance", "confidences", "desirs",
  "preferences-intimes", "fantasmes", "experiences", "sexualite-communication",
  "redecouverte", "scenarios", "limites-defis"
];
const CONTEXTS = ["tous", "rencontre", "decouverte", "couple", "intimite"];
const MODES = ["duo", "duos", "personnalise"];
const DURATIONS = ["courte", "moyenne", "longue"];
const VISIBILITIES = ["partagee", "anonyme", "privee"];
const ID_PATTERN = /^qsp-l([1-4])-(ques|defi|surp|scen)-(\d{2})$/;
const INTENSITY_BANDS = { 1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [4, 5] };
const FAMILY_TARGET = { ques: 10, defi: 8, surp: 6, scen: 6 };

const errors = [];
const fail = (message) => errors.push(message);
const normalize = (text) => text.toLowerCase().replace(/\s+/g, " ").replace(/[«»"']/g, "").trim();

if (!fs.existsSync(JSON_PATH)) {
  console.error(`✗ ${JSON_PATH} introuvable.`);
  process.exit(1);
}

const cards = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
if (!Array.isArray(cards)) {
  console.error("✗ Le fichier doit contenir un tableau de cartes.");
  process.exit(1);
}

const ids = new Set();
const texts = new Set();
const familyCount = {};
const levelCount = {};
const typeCount = {};
const audienceCount = {};

cards.forEach((card, index) => {
  const label = card?.id || `#${index + 1}`;
  const keys = Object.keys(card ?? {});
  for (const field of FIELDS) if (!keys.includes(field)) fail(`${label} : champ manquant « ${field} »`);
  for (const key of keys) if (!FIELDS.includes(key)) fail(`${label} : champ inconnu « ${key} »`);

  const match = ID_PATTERN.exec(card?.id ?? "");
  if (!match) fail(`${label} : identifiant invalide (attendu qsp-l<1-4>-<ques|defi|surp|scen>-<nn>)`);
  else {
    if (Number(match[1]) !== card.level) fail(`${label} : le niveau de l'identifiant ne correspond pas au champ level`);
    familyCount[match[2]] = (familyCount[match[2]] ?? 0) + 1;
  }
  if (ids.has(card?.id)) fail(`${label} : identifiant en double`);
  ids.add(card?.id);

  if (typeof card?.text !== "string" || card.text.trim().length < 20 || card.text.length > 260) {
    fail(`${label} : texte attendu entre 20 et 260 caractères`);
  } else if (texts.has(normalize(card.text))) {
    fail(`${label} : texte identique à une autre carte`);
  } else {
    texts.add(normalize(card.text));
  }

  if (!TYPES.includes(card?.type)) fail(`${label} : format inconnu « ${card?.type} »`);
  else typeCount[card.type] = (typeCount[card.type] ?? 0) + 1;

  if (!AUDIENCES.includes(card?.audience)) fail(`${label} : audience inconnue « ${card?.audience} »`);
  else audienceCount[card.audience] = (audienceCount[card.audience] ?? 0) + 1;

  if (!Number.isInteger(card?.level) || card.level < 1 || card.level > 4) fail(`${label} : level doit valoir 1 à 4`);
  else levelCount[card.level] = (levelCount[card.level] ?? 0) + 1;

  if (!CATEGORIES.includes(card?.category)) fail(`${label} : catégorie inconnue « ${card?.category} »`);
  if (!CONTEXTS.includes(card?.context)) fail(`${label} : contexte inconnu « ${card?.context} »`);

  if (!Array.isArray(card?.modes) || card.modes.length === 0) fail(`${label} : modes doit être une liste non vide`);
  else {
    for (const mode of card.modes) if (!MODES.includes(mode)) fail(`${label} : mode inconnu « ${mode} »`);
    if (new Set(card.modes).size !== card.modes.length) fail(`${label} : mode en double`);
    if (GROUP_AUDIENCES.includes(card.audience) && !(card.modes.length === 1 && card.modes[0] === "duos")) {
      fail(`${label} : une carte adressée à ${card.audience} doit être jouée en mode duos uniquement`);
    }
    if (card.modes.includes("personnalise") && GROUP_AUDIENCES.includes(card.audience)) {
      fail(`${label} : le mode personnalisé n'est pas disponible pour l'audience ${card.audience}`);
    }
  }

  if (!Number.isInteger(card?.intensity) || card.intensity < 1 || card.intensity > 5) {
    fail(`${label} : intensity doit valoir 1 à 5`);
  } else if (INTENSITY_BANDS[card.level]) {
    const [min, max] = INTENSITY_BANDS[card.level];
    if (card.intensity < min || card.intensity > max) {
      fail(`${label} : intensity ${card.intensity} hors de la bande ${min}-${max} du niveau ${card.level}`);
    }
  }

  if (typeof card?.emoji !== "string" || card.emoji.trim() === "" || card.emoji.length > 8) {
    fail(`${label} : emoji manquant ou invalide`);
  }
  if (!DURATIONS.includes(card?.duration)) fail(`${label} : durée inconnue « ${card?.duration} »`);
  if (!VISIBILITIES.includes(card?.visibility)) fail(`${label} : visibilité inconnue « ${card?.visibility} »`);

  if (card.visibility === "anonyme" && !["all_players", "other_duo", "individual_choice"].includes(card.audience)) {
    fail(`${label} : une réponse anonyme n'a de sens que devant un groupe ou à audience choisie`);
  }
  if (card.visibility === "privee" && !INTIMATE_AUDIENCES.includes(card.audience)) {
    fail(`${label} : une réponse privée ne s'adresse qu'à soi ou à son partenaire`);
  }
  if (card?.skip_allowed !== true) fail(`${label} : skip_allowed doit rester true (charte de consentement)`);
  if (typeof card?.consent_note !== "string" || card.consent_note.trim().length < 10 || card.consent_note.length > 220) {
    fail(`${label} : note de consentement attendue entre 10 et 220 caractères`);
  }
});

for (const [family, target] of Object.entries(FAMILY_TARGET)) {
  if ((familyCount[family] ?? 0) !== target) fail(`famille ${family} : ${familyCount[family] ?? 0} carte(s), ${target} attendue(s)`);
}
for (const level of [1, 2, 3, 4]) {
  if (!levelCount[level]) fail(`niveau ${level} : aucune carte`);
}
for (const type of TYPES) {
  if (!typeCount[type]) fail(`format ${type} : aucun exemple dans le pilote`);
}
for (const audience of AUDIENCES) {
  if ((audienceCount[audience] ?? 0) < 2) fail(`audience ${audience} : ${audienceCount[audience] ?? 0} carte(s), au moins 2 attendues`);
}

const escapeCsv = (value) => {
  const text = Array.isArray(value) ? value.join("|") : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = `\uFEFF${FIELDS.join(",")}\n${cards.map((card) => FIELDS.map((field) => escapeCsv(card[field] ?? "")).join(",")).join("\n")}\n`;

if (errors.length) {
  console.error("✗ Catalogue pilote invalide :\n  - " + errors.join("\n  - "));
  process.exit(1);
}

if (process.argv.includes("--check")) {
  const current = fs.existsSync(CSV_PATH) ? fs.readFileSync(CSV_PATH, "utf8") : "";
  if (current !== csv) {
    console.error("✗ Le CSV n'est pas synchronisé (node scripts/cards.mjs --csv).");
    process.exit(1);
  }
  console.log(`✓ Catalogue pilote valide et CSV synchronisé (${cards.length} cartes).`);
} else {
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  fs.writeFileSync(CSV_PATH, csv);
  console.log(`✓ ${CSV_PATH} écrit (${cards.length} cartes).`);
  console.log(`  familles : ${Object.entries(familyCount).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
  console.log(`  niveaux  : ${Object.entries(levelCount).map(([k, v]) => `L${k}=${v}`).join(" · ")}`);
  console.log(`  audiences: ${Object.entries(audienceCount).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
  console.log(`  formats  : ${Object.keys(typeCount).length}/10 représentés`);
}

import test from "node:test";
import assert from "node:assert/strict";
import { messageKeys, translate } from "./i18n.ts";
import { GUIDE, TIPS } from "./guide.ts";
import { checkQuestions } from "./custom.ts";

test("i18n : le dictionnaire français et anglais exposent les mêmes clés", () => {
  assert.ok(messageKeys.length > 60, `clés trouvées : ${messageKeys.length}`);
  for (const key of messageKeys) {
    assert.ok(translate("fr", key).trim().length > 0, `fr vide : ${key}`);
    assert.ok(translate("en", key).trim().length > 0, `en vide : ${key}`);
    assert.notEqual(translate("en", key), key, `clé absente de l'anglais : ${key}`);
  }
});

test("guide : Personnalisé n’est plus annoncé comme verrouillé", () => {
  for (const lang of ["fr", "en"] as const) {
    const text = `${GUIDE[lang].map((s) => s.body.join(" ")).join(" ")} ${TIPS[lang].mode.body}`.toLowerCase();
    const locked = new RegExp(lang === "fr" ? "verrouill|fermé" : "locked|closed");
    const subject = lang === "fr" ? /personnalis/ : /custom/;
    // Une phrase ne peut pas à la fois parler du salon Personnalisé et le dire verrouillé.
    const phrases = text.split(/[.!?;]/);
    const faulty = phrases.filter((phrase) => subject.test(phrase) && locked.test(phrase));
    assert.equal(faulty.length, 0, `${lang} : ${faulty[0]?.slice(0, 90) ?? ""}`);
  }
});

test("guide : le consentement 18+ dépend du salon (deux ou quatre)", () => {
  const fr = GUIDE.fr.map((s) => s.body.join(" ")).join(" ").toLowerCase();
  assert.ok(fr.includes("deux") && fr.includes("quatre"), "le guide doit distinguer les deux salons");
  assert.ok(fr.includes("des quatre en duos") || fr.includes("quatre en duos"));
  const en = GUIDE.en.map((s) => s.body.join(" ")).join(" ").toLowerCase();
  assert.ok(en.includes("four in duos"));
});

test("infobulles : l’intensité parle du bon nombre de joueurs dans les deux langues", () => {
  assert.match(TIPS.fr.intensity.body, /deux en Couple, quatre en DUOS/);
  assert.match(TIPS.en.intensity.body, /two players in Couple, four in DUOS/);
});

test("personnalisé : la limite affichée par l’écran correspond à celle du serveur", () => {
  const tooMany = Array.from({ length: 25 }, (_, i) => `Question numéro ${i + 1} ?`);
  assert.equal(checkQuestions(tooMany).ok, false);
  assert.equal(checkQuestions(tooMany.slice(0, 24)).ok, true);
});

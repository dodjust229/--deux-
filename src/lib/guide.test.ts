import test from "node:test";
import assert from "node:assert/strict";
import { GUIDE, TIPS, type TipId } from "./guide.ts";

test("guide : mêmes rubriques en français et en anglais", () => {
  const fr = GUIDE.fr.map((section) => section.id);
  const en = GUIDE.en.map((section) => section.id);
  assert.deepEqual(fr, en);
  assert.equal(fr.length, 11);
});

test("guide : chaque rubrique a un titre et au moins deux paragraphes", () => {
  for (const lang of ["fr", "en"] as const) {
    for (const section of GUIDE[lang]) {
      assert.ok(section.title.trim().length > 3, `${lang}/${section.id} : titre`);
      assert.ok(section.body.length >= 2, `${lang}/${section.id} : paragraphes`);
      for (const paragraph of section.body) assert.ok(paragraph.trim().length > 20, `${lang}/${section.id} : paragraphe vide`);
    }
  }
});

test("guide : les rubriques obligatoires du cahier sont présentes", () => {
  const required = ["decouvrir", "salon", "creer", "rejoindre", "niveaux", "categories", "salons-fonctions", "revelations", "personnalisation", "consentement", "parametres"];
  const ids = GUIDE.fr.map((section) => section.id);
  for (const id of required) assert.ok(ids.includes(id), `rubrique manquante : ${id}`);
});

test("infobulles : mêmes clés dans les deux langues", () => {
  const fr = Object.keys(TIPS.fr).sort();
  const en = Object.keys(TIPS.en).sort();
  assert.deepEqual(fr, en);
  for (const key of fr) {
    assert.ok(TIPS.fr[key as TipId].title.length > 3);
    assert.ok(TIPS.fr[key as TipId].body.length > 20);
    assert.ok(TIPS.en[key as TipId].body.length > 20);
  }
});

test("guide : les modes indisponibles sont annoncés comme tels", () => {
  const text = GUIDE.fr.map((section) => section.body.join(" ")).join(" ").toLowerCase();
  assert.ok(text.includes("verrouillés") || text.includes("fermé"));
  assert.ok(text.includes("relances n'existent pas"));
});

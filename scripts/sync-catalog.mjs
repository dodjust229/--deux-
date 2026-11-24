// Génère supabase/02_catalog.sql et la migration 22 depuis src/catalog.json.
import fs from "node:fs";
const cats = ["decouverte","complicite","profondeur","seduction","audacieux"];
const kinds = ["free","secret","prediction","challenge","cross"];
const items = JSON.parse(fs.readFileSync("src/catalog.json","utf8"));
const errors = [], seen = new Set(), seenTitles = new Map();
for (const it of items) {
  if (!/^[a-z]\d{2}$/.test(it.id ?? "")) errors.push("Identifiant invalide : " + it.id);
  if (seen.has(it.id)) errors.push("Identifiant en double : " + it.id);
  seen.add(it.id);
  if (!cats.includes(it.category)) errors.push(it.id + " : catégorie inconnue");
  if (!kinds.includes(it.kind)) errors.push(it.id + " : type inconnu");
  if (!it.title || !it.prompt) errors.push(it.id + " : titre/consigne manquant");
  const titleKey = (it.title ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
  if (titleKey && seenTitles.has(titleKey)) errors.push("Titre en double : " + it.title + " (" + seenTitles.get(titleKey) + " / " + it.id + ")");
  if (titleKey) seenTitles.set(titleKey, it.id);
  if (it.prompt && !/\p{Extended_Pictographic}/u.test(it.prompt)) errors.push(it.id + " : emoji manquant dans la question");
  if (["challenge","cross"].includes(it.kind) && !it.prompt.includes("?")) errors.push(it.id + " : un défi doit être formulé comme une question");
  if (![1,2,3,4].includes(it.level)) errors.push(it.id + " : niveau technique invalide (1 à 4)");
  if (![1,2,3,4,5].includes(it.intensity)) errors.push(it.id + " : intensité éditoriale invalide (1 à 5)");
  if (it.kind === "secret" && !(it.options?.length >= 2)) errors.push(it.id + " : un choix secret exige des options");
}
for (const intensity of [1,2,3,4,5]) {
  if (!items.some(item => item.intensity === intensity)) errors.push("Aucune carte pour l'intensité " + intensity + ".");
}
if (errors.length) { console.error("✗ Catalogue invalide :\n  - " + errors.join("\n  - ")); process.exit(1); }
const q = v => String(v).replace(/'/g, "''");
const rows = items.map(i => "  ('" + q(i.id) + "','" + q(i.category) + "','" + q(i.kind) + "'," +
  (i.options ? "'" + q(JSON.stringify(i.options)) + "'::jsonb" : "null") + "," + i.level + "," + i.intensity + ")").join(",\n");
const ids = items.map(i => "'" + q(i.id) + "'").join(",");
const upsert = "insert into public.catalog(id,category,kind,options,level,intensity) values\n" + rows +
  "\non conflict (id) do update set category=excluded.category, kind=excluded.kind, options=excluded.options, level=excluded.level, intensity=excluded.intensity;\n";
const cleanup = "\ndelete from public.catalog where id not in (" + ids + ");\n";
const sql = "-- GÉNÉRÉ par scripts/sync-catalog.mjs — ne pas modifier à la main.\n" + upsert + cleanup;
const migration = "-- QSPICY · Remplacement intégral du catalogue par le master V2 (" + items.length + " cartes).\n" +
  "-- Migration additive/idempotente : préserve salles/réponses, remplace uniquement les cartes du catalogue.\n" +
  "alter table public.catalog add column if not exists intensity integer;\n" +
  "update public.catalog set intensity = least(5, greatest(1, coalesce(intensity, level))) where intensity is null;\n" +
  "alter table public.catalog alter column intensity set default 1;\n" +
  "alter table public.catalog alter column intensity set not null;\n" +
  "alter table public.catalog alter column explicit_rank set default 1;\n" +
  "do $ begin\n  if not exists (select 1 from pg_constraint where conname='catalog_intensity_check') then\n" +
  "    alter table public.catalog add constraint catalog_intensity_check check (intensity between 1 and 5);\n  end if;\nend $$;\n" +
  upsert + cleanup + "\nupdate public.catalog set explicit_rank = least(4, intensity) where explicit_rank is distinct from least(4, intensity);\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync("supabase/02_catalog.sql") ? fs.readFileSync("supabase/02_catalog.sql","utf8") : "";
  const curMigration = fs.existsSync("supabase/22_catalogue_maitre_v2.sql") ? fs.readFileSync("supabase/22_catalogue_maitre_v2.sql","utf8") : "";
  if (cur !== sql || curMigration !== migration) { console.error("✗ SQL du catalogue non synchronisé (npm run catalog:sync)."); process.exit(1); }
  console.log("✓ Catalogue synchronisé (" + items.length + " cartes, 5 intensités).");
} else {
  fs.writeFileSync("supabase/02_catalog.sql", sql);
  fs.writeFileSync("supabase/22_catalogue_maitre_v2.sql", migration);
  console.log("✓ Catalogue et migration écrits (" + items.length + " cartes).");
}

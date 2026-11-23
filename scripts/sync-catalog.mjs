// Génère supabase/02_catalog.sql depuis src/catalog.json. Usage : node scripts/sync-catalog.mjs [--check]
import fs from "node:fs";
const cats = ["decouverte","complicite","profondeur","seduction","audacieux"];
const kinds = ["free","secret","prediction","challenge","cross"];
const items = JSON.parse(fs.readFileSync("src/catalog.json","utf8"));
const errors = [], seen = new Set();
for (const it of items) {
  if (!/^[a-z]\d{2}$/.test(it.id ?? "")) errors.push(`Identifiant invalide : ${it.id}`);
  if (seen.has(it.id)) errors.push(`Identifiant en double : ${it.id}`);
  seen.add(it.id);
  if (!cats.includes(it.category)) errors.push(`${it.id} : catégorie inconnue`);
  if (!kinds.includes(it.kind)) errors.push(`${it.id} : type inconnu`);
  if (!it.title || !it.prompt) errors.push(`${it.id} : titre/consigne manquant`);
  if (it.kind === "secret" && !(it.options?.length >= 2)) errors.push(`${it.id} : un choix secret exige des options`);
}
if (errors.length) { console.error("✗ Catalogue invalide :\n  - " + errors.join("\n  - ")); process.exit(1); }
const q = v => v.replace(/'/g, "''");
const rows = items.map(i => `  ('${i.id}','${i.category}','${i.kind}',${i.options ? `'${q(JSON.stringify(i.options))}'::jsonb` : "null"})`).join(",\n");
const sql = `-- GÉNÉRÉ par scripts/sync-catalog.mjs — ne pas modifier à la main.\ntruncate public.catalog;\ninsert into public.catalog(id,category,kind,options) values\n${rows};\n`;
if (process.argv.includes("--check")) {
  const cur = fs.existsSync("supabase/02_catalog.sql") ? fs.readFileSync("supabase/02_catalog.sql","utf8") : "";
  if (cur !== sql) { console.error("✗ supabase/02_catalog.sql n'est pas synchronisé (npm run catalog:sync)."); process.exit(1); }
  console.log(`✓ Catalogue synchronisé (${items.length} interactions).`);
} else { fs.writeFileSync("supabase/02_catalog.sql", sql); console.log(`✓ supabase/02_catalog.sql écrit (${items.length} interactions).`); }

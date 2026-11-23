// Regénère a-deux-source.tar.gz depuis les sources du dépôt (exports Render / GitHub Actions).
// Usage : node scripts/pack-source.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const archive = "a-deux-source.tar.gz";
const include = [
  "index.html", "package.json", "package-lock.json", "tsconfig.json", "tsconfig.app.json",
  "tsconfig.node.json", "vite.config.ts", "netlify.toml", ".nvmrc", ".gitignore", ".env.example",
  "src", "supabase", "scripts", "README.md", "INSTALLATION.md", "TESTS_A_DEUX.md",
  "AUDIT_ETAT.md", "JOURNAL_DECISIONS.md"
].filter((p) => fs.existsSync(p));

if (fs.existsSync(archive)) fs.rmSync(archive);
execFileSync("tar", ["--exclude=node_modules", "--exclude=dist", "--exclude=.env", "-czf", archive, ...include], {
  stdio: "inherit"
});
const size = (fs.statSync(archive).size / 1024).toFixed(0);
console.log(`✓ ${archive} régénéré (${size} Ko, ${include.length} entrées)`);

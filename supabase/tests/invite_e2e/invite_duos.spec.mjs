// Recette d'invitation — DUOS et lien tronqué.
//
// Deux cas que la recette Personnalisé ne couvrait pas :
//   - le mode DUOS : quatre joueurs entrent par le même lien, un cinquième est refusé ;
//   - un lien d'invitation Personnalisé auquel il manque `&mode=custom` (lien tronqué,
//     favori enregistré) : l'invité doit tout de même arriver dans le bon format, parce que
//     le type du salon est désormais porté par la salle (migration 19).
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5299/";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const results = [];
const ok = (name, pass, info = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${info ? ` (${info})` : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
const page = async () => {
  const p = await (await browser.createBrowserContext()).newPage();
  await p.setViewport({ width: 430, height: 940 });
  p.on("pageerror", (error) => console.log(`erreur de page : ${error.message}`));
  return p;
};

const wait = (p, selector, timeout = 25000) => p.waitForSelector(selector, { visible: true, timeout });
const text = (p, selector) => p.$eval(selector, (el) => el.textContent.trim()).catch(() => null);
const bodyHas = (p, needle, timeout = 25000) =>
  p.waitForFunction((value) => document.body.innerText.includes(value), { timeout }, needle);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createRoom(p, mode, nickname) {
  await p.goto(BASE, { waitUntil: "networkidle2" });
  await p.click('[data-testid="enter"]');
  await wait(p, `[data-testid="mode-${mode}"]`);
  await p.click(`[data-testid="mode-${mode}"]`);
  await wait(p, '[data-testid="prefs-continue"]');
  await p.click('[data-testid="prefs-continue"]');
  await p.type('[data-testid="nickname"]', nickname);
  await p.click('[data-testid="persona-masculin"]');
  await p.click('[data-testid="enter-submit"]');
}

async function joinByLink(p, url, nickname) {
  await p.goto(url, { waitUntil: "networkidle2" });
  await wait(p, '[data-testid="nickname"]');
  await p.type('[data-testid="nickname"]', nickname);
  await p.click('[data-testid="persona-feminin"]');
  await p.click('[data-testid="enter-submit"]');
}

try {
  // ===== DUOS =====
  const host = await page();
  await createRoom(host, "duos", "Hote");
  await wait(host, '[data-testid="duo-invite"]');
  const duoInvite = await text(host, '[data-testid="duo-invite"]');
  ok("D01 le lien DUOS porte le salon", /room=[0-9a-f-]{36}/.test(duoInvite), duoInvite);

  const guests = [];
  for (const name of ["Deux", "Trois", "Quatre"]) {
    const g = await page();
    await joinByLink(g, duoInvite, name);
    guests.push(g);
  }
  await bodyHas(host, "Salon complet", 30000).catch(() => {});
  ok("D02 les quatre joueurs DUOS sont réunis par le même lien",
    await host.evaluate(() => document.body.innerText.includes("Salon complet")));

  const fifth = await page();
  await joinByLink(fifth, duoInvite, "Cinq");
  await sleep(3500);
  const refusal = await fifth.evaluate(() => {
    const el = document.querySelector(".form-error, .error, [role='alert'], .notice");
    return el ? el.textContent.trim() : "";
  });
  ok("D03 un cinquième joueur DUOS est refusé avec un message lisible",
    Boolean(await fifth.$('[data-testid="enter-submit"]')) && refusal.length > 5, refusal.slice(0, 160));

  // ===== Lien Personnalisé tronqué (sans &mode=custom) =====
  const customHost = await page();
  await createRoom(customHost, "custom", "HotePerso");
  await wait(customHost, '[data-testid="invite-url"]');
  const fullInvite = await text(customHost, '[data-testid="invite-url"]');
  const truncated = fullInvite.replace("&mode=custom", "");
  ok("D04 le lien tronqué a bien perdu son paramètre de mode",
    !truncated.includes("mode=custom") && truncated.includes("room="), truncated);

  const customGuest = await page();
  await joinByLink(customGuest, truncated, "InvitePerso");
  await bodyHas(customGuest, "En attente du lancement par l'hôte", 30000).catch(() => {});
  ok("D05 un lien tronqué fait quand même arriver l'invité dans le salon Personnalisé",
    Boolean(await text(customGuest, ".custom-panel__count")), await text(customGuest, ".custom-panel__count"));
  ok("D06 l'invité du lien tronqué ne voit aucun bouton de lancement catalogue",
    (await customGuest.$('[data-testid="launch"]')) === null);
} catch (error) {
  console.log("ERREUR :", error.message);
} finally {
  const passed = results.filter((result) => result.pass).length;
  console.log(`\n${passed}/${results.length} vérifications réussies`);
  await browser.close();
  process.exitCode = passed === results.length ? 0 : 1;
}

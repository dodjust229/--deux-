// Recette d'invitation du mode Personnalisé, deux navigateurs.
//
// L'hôte compose une sélection, l'invité entre par le lien seul, les deux jouent la même
// séquence dans le même ordre. Chaque échec est imprimé avec la réponse du serveur.
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5299/";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const results = [];
const calls = [];
const ok = (name, pass, info = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${info ? ` (${info})` : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
const A = await (await browser.createBrowserContext()).newPage();
const B = await (await browser.createBrowserContext()).newPage();
const C = await (await browser.createBrowserContext()).newPage();

for (const [label, page] of [["A", A], ["B", B], ["C", C]]) {
  await page.setViewport({ width: 430, height: 940 });
  page.on("pageerror", (error) => console.log(`[${label}] erreur de page : ${error.message}`));
  page.on("response", async (response) => {
    if (!response.url().includes("/rest/v1/rpc/")) return;
    const fn = response.url().split("/rpc/")[1];
    const body = await response.text().catch(() => "");
    calls.push({ label, fn, status: response.status(), body: body.slice(0, 300) });
    if (response.status() >= 400) console.log(`[${label}] ${fn} ${response.status()} ${body.slice(0, 160)}`);
  });
}

const wait = (page, selector, timeout = 25000) => page.waitForSelector(selector, { visible: true, timeout });
const text = (page, selector) => page.$eval(selector, (el) => el.textContent.trim()).catch(() => null);
const bodyHas = (page, needle, timeout = 25000) =>
  page.waitForFunction((value) => document.body.innerText.includes(value), { timeout }, needle);
const card = (page) => page.evaluate(() => {
  const title = document.querySelector("#prompt-title")?.textContent?.trim();
  const body = document.querySelector(".prompt__text")?.textContent?.trim();
  return title ? `${title} · ${body}` : null;
});
const passEnabled = (page) => page.waitForFunction(
  () => { const b = document.querySelector('[data-testid="pass"]'); return b && !b.disabled; },
  { timeout: 20000 }
);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  // I01 — l'hôte ouvre un salon Personnalisé
  await A.goto(BASE, { waitUntil: "networkidle2" });
  await A.click('[data-testid="enter"]');
  await wait(A, '[data-testid="mode-custom"]');
  await A.click('[data-testid="mode-custom"]');
  await wait(A, '[data-testid="prefs-continue"]');
  await A.click('[data-testid="prefs-continue"]');
  await A.type('[data-testid="nickname"]', "Alex");
  await A.click('[data-testid="persona-masculin"]');
  await A.click('[data-testid="enter-submit"]');
  await wait(A, '[data-testid="invite-url"]');
  const invite = await text(A, '[data-testid="invite-url"]');
  ok("I01 le lien porte le salon et le mode Personnalisé",
    /room=[0-9a-f-]{36}/.test(invite) && invite.includes("mode=custom"), invite);

  // I02 — l'invité entre par le lien seul
  await B.goto(invite, { waitUntil: "networkidle2" });
  await wait(B, '[data-testid="nickname"]');
  ok("I02 le lien ouvre directement l'écran d'entrée de l'invité", Boolean(await B.$('[data-testid="room-code"]')));
  await B.type('[data-testid="nickname"]', "Sam");
  await B.click('[data-testid="persona-feminin"]');
  await B.click('[data-testid="enter-submit"]');
  await bodyHas(B, "En attente du lancement par l'hôte", 30000);
  ok("I03 l'invité arrive dans le salon Personnalisé, pas dans le catalogue",
    Boolean(await text(B, ".custom-panel__count")), await text(B, ".custom-panel__count"));
  ok("I04 l'invité ne voit aucun bouton de lancement catalogue", (await B.$('[data-testid="launch"]')) === null);

  await bodyHas(A, "La scène est prête", 25000).catch(() => {});
  ok("I05 l'hôte voit les deux joueurs dans le salon",
    await A.evaluate(() => document.body.innerText.includes("La scène est prête")));

  // I06 — l'hôte compose une sélection, les deux donnent l'accord 18+
  for (const page of [A, B]) {
    await page.evaluate(() => {
      const box = document.querySelector(".custom-panel input[type='checkbox']");
      if (box && !box.checked) box.click();
    });
  }
  await A.select("#custom-count", "5");
  await A.click('[data-testid="custom-generate"]');
  await wait(A, ".custom-list__preview");
  const deck = await A.$$eval(".custom-list__preview", (els) => els.map((el) => el.textContent.trim()));
  ok("I06 la sélection compte 5 cartes", deck.length === 5, String(deck.length));
  await A.waitForFunction(
    () => document.querySelector('[data-testid="custom-launch"]')?.disabled === false, { timeout: 15000 }
  ).catch(() => {});
  ok("I07 le lancement s'ouvre quand l'invité est là et les accords donnés",
    await A.evaluate(() => document.querySelector('[data-testid="custom-launch"]')?.disabled === false));

  // I08 — lancement : les deux entrent dans la même séquence
  await A.click('[data-testid="custom-launch"]');
  await wait(A, "#prompt-title", 30000);
  await wait(B, "#prompt-title", 30000);
  const hostFirst = await card(A);
  const guestFirst = await card(B);
  ok("I08 l'invité reçoit la carte que l'hôte a composée", guestFirst === hostFirst, guestFirst ?? "");
  ok("I09 la première carte vient bien de la sélection", Boolean(deck[0]) && hostFirst?.includes(deck[0].slice(0, 30)),
    deck[0]?.slice(0, 30) ?? "");

  // I10 — les deux passent, la séquence avance des deux côtés
  await passEnabled(A);
  await A.click('[data-testid="pass"]');
  await passEnabled(B);
  await B.click('[data-testid="pass"]');
  await wait(A, '[data-testid="reveal"]', 25000);
  await wait(B, '[data-testid="reveal"]', 25000);
  ok("I10 l'invité voit la révélation de la carte passée", Boolean(await text(B, '[data-testid="reveal"]')));
  await A.click('[data-testid="next"]');
  await sleep(1200);
  await B.click('[data-testid="next"]');
  await sleep(2500);
  const hostSecond = await card(A);
  const guestSecond = await card(B);
  ok("I11 la deuxième carte arrive dans le même ordre chez l'invité",
    hostSecond === guestSecond && hostSecond !== hostFirst, guestSecond ?? "");

  // I12 — l'invité recharge son lien
  await B.reload({ waitUntil: "networkidle2" });
  await sleep(3000);
  ok("I12 un rechargement de l'invité le laisse dans la séquence Personnalisée",
    (await card(B)) === guestSecond, (await card(B)) ?? "(écran d'entrée)");

  // I13 — un troisième joueur par le même lien est refusé lisiblement
  await C.goto(invite, { waitUntil: "networkidle2" });
  await wait(C, '[data-testid="nickname"]');
  await C.type('[data-testid="nickname"]', "Noa");
  await C.click('[data-testid="enter-submit"]');
  await sleep(3500);
  const refusal = await C.evaluate(() => {
    const el = document.querySelector(".error, [role='alert'], .notice");
    return el ? el.textContent.trim() : "";
  });
  ok("I13 un salon complet refuse un troisième joueur avec un message lisible",
    Boolean(await C.$('[data-testid="enter-submit"]')) && refusal.length > 5, refusal.slice(0, 160));

  // Diagnostic — la séquence telle que le serveur la renvoie à l'invité
  const probe = await B.evaluate(async () => {
    const room = new URLSearchParams(location.search).get("room");
    const key = Object.keys(localStorage).find((name) => name.includes("identity"));
    const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
    const response = await fetch("/rest/v1/rpc/get_custom_deck", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ p_room_id: room, p_player_token: saved.token })
    });
    return { status: response.status, body: await response.text() };
  }).catch((error) => ({ status: 0, body: String(error) }));
  console.log(`DIAGNOSTIC get_custom_deck côté invité : ${probe.status} ${String(probe.body).slice(0, 160)}`);
} catch (error) {
  console.log("ERREUR :", error.message);
  await A.screenshot({ path: "/tmp/qspicy-invite-fail-A.png" }).catch(() => {});
  await B.screenshot({ path: "/tmp/qspicy-invite-fail-B.png" }).catch(() => {});
} finally {
  const passed = results.filter((result) => result.pass).length;
  console.log(`\n${passed}/${results.length} vérifications réussies`);
  const fs = await import("node:fs");
  fs.writeFileSync("/tmp/qspicy-invite-calls.json", JSON.stringify(calls, null, 1));
  await browser.close();
  process.exitCode = passed === results.length ? 0 : 1;
}

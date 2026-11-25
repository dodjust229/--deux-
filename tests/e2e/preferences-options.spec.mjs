import { test, expect } from "@playwright/test";

test("le parcours affiche les salons retenus et trois ambiances sans paliers", async ({ page }) => {
  await page.goto("/?apercu=home");
  await page.getByTestId("enter").click();

  await expect(page.getByTestId("mode-couple")).toBeVisible();
  await expect(page.getByTestId("mode-custom")).toBeVisible();
  await expect(page.getByTestId("mode-duos")).toBeVisible();
  await expect(page.getByTestId("mode-anonymous")).toBeDisabled();
  await expect(page.getByTestId("mode-side")).toHaveCount(0);
  await expect(page.locator(".info__button")).toHaveCount(0);
  await expect(page.getByText(/mode vocal n'est pas encore disponible/i)).toHaveCount(0);

  await page.getByTestId("mode-couple").click();
  await expect(page.getByTestId("prefs-ambience-soft")).toBeVisible();
  await expect(page.getByTestId("prefs-ambience-audacious")).toBeVisible();
  await expect(page.getByTestId("prefs-ambience-all")).toBeVisible();
  await expect(page.getByText("Palier de jeu")).toHaveCount(0);
  await expect(page.getByText("Équilibrées")).toHaveCount(0);
  await expect(page.locator('[data-testid^="prefs-ambience-"]')).toHaveCount(3);

  await page.getByTestId("prefs-ambience-audacious").click();
  await expect(page.getByTestId("prefs-ambience-audacious")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("prefs-continue").click();
  await expect(page.getByRole("heading", { name: "Ouvrir votre salle" })).toBeVisible();
});

test("la préférence Audacieux ne laisse apparaître que cette catégorie dans le salon", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qspicy.prefs.v1", JSON.stringify({ intensity: "audacious" })));
  await page.goto("/?apercu=zone2-lobby");
  await expect(page.getByRole("radio", { name: /Audacieux/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Découverte/ })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /Confidence/ })).toHaveCount(0);
});

test("les trois ambiances filtrent correctement les catégories dans À Deux et DUOS", async ({ browser }) => {
  const presets = [
    {
      intensity: "soft",
      visible: ["Découverte", "Complicité", "Confidence", "Séduction"],
      hidden: ["Audacieux"]
    },
    {
      intensity: "audacious",
      visible: ["Audacieux"],
      hidden: ["Découverte", "Complicité", "Confidence", "Séduction"]
    },
    {
      intensity: "all",
      visible: ["Découverte", "Complicité", "Confidence", "Séduction", "Audacieux"],
      hidden: []
    }
  ];

  for (const mode of ["couple", "duos"]) {
    for (const preset of presets) {
      const context = await browser.newContext();
      await context.addInitScript((intensity) => {
        localStorage.setItem("qspicy.prefs.v1", JSON.stringify({ intensity }));
      }, preset.intensity);
      const page = await context.newPage();
      await page.goto(mode === "duos" ? "/?apercu=duo-lobby" : "/?apercu=zone2-lobby");

      for (const category of preset.visible) {
        await expect(page.getByRole("radio", { name: new RegExp(category, "i") })).toBeVisible();
      }
      for (const category of preset.hidden) {
        await expect(page.getByRole("radio", { name: new RegExp(category, "i") })).toHaveCount(0);
      }

      await context.close();
    }
  }
});

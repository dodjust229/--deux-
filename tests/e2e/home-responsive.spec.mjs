import { test, expect } from "@playwright/test";

const viewports = [
  { name: "petit mobile", width: 360, height: 640, image: "accueil-mobile.webp" },
  { name: "mobile courant", width: 390, height: 844, image: "accueil-mobile.webp" },
  { name: "tablette", width: 768, height: 1024, image: "accueil-tablette.webp" },
  { name: "bureau", width: 1365, height: 900, image: "accueil-bureau.webp" }
];

for (const viewport of viewports) {
  test(`accueil ${viewport.name} : image adaptée, contenu lisible et aucun débordement horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await expect(page.locator(".home--hero")).toBeVisible();

    const image = page.locator(".home__bg img");
    await page.waitForFunction(() => {
      const img = document.querySelector(".home__bg img");
      return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0;
    });

    const currentSrc = await image.evaluate((img) => (img as HTMLImageElement).currentSrc);
    expect(currentSrc).toContain(viewport.image);

    const layout = await page.evaluate(() => {
      const hero = document.querySelector(".home--hero")!.getBoundingClientRect();
      const picture = document.querySelector(".home__bg")!.getBoundingClientRect();
      const copy = document.querySelector(".home__hero")!.getBoundingClientRect();
      const heading = document.querySelector(".home__tagline")!.getBoundingClientRect();
      const enter = document.querySelector('[data-testid="enter"]')!.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        heroBottom: hero.bottom,
        pictureBottom: picture.bottom,
        copyTop: copy.top,
        headingTop: heading.top,
        enterLeft: enter.left,
        enterRight: enter.right,
        enterBottom: enter.bottom
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.copyTop).toBeGreaterThanOrEqual(layout.pictureBottom - 1);
    expect(layout.headingTop).toBeGreaterThanOrEqual(layout.pictureBottom - 1);
    expect(layout.enterLeft).toBeGreaterThanOrEqual(0);
    expect(layout.enterRight).toBeLessThanOrEqual(viewport.width + 1);
    expect(layout.enterBottom).toBeLessThanOrEqual(layout.heroBottom + 1);

    if (viewport.width <= 699) {
      expect(layout.enterBottom).toBeLessThanOrEqual(viewport.height + 1);
    }
  });
}

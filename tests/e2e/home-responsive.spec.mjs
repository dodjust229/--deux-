import { test, expect } from "@playwright/test";

const viewports = [
  { name: "petit mobile", width: 360, height: 640, image: "accueil-qspicy.webp" },
  { name: "mobile courant", width: 390, height: 844, image: "accueil-qspicy.webp" },
  { name: "tablette", width: 768, height: 1024, image: "accueil-qspicy.webp" },
  { name: "bureau", width: 1365, height: 900, image: "accueil-qspicy.webp" }
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

    const currentSrc = await image.evaluate((img) => img.currentSrc);
    expect(currentSrc).toContain(viewport.image);

    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing element: ${selector}`);
        return element.getBoundingClientRect();
      };
      const hero = rect(".home--hero");
      const picture = rect(".home__bg");
      const copy = rect(".home__hero");
      const heading = rect(".home__tagline");
      const enter = rect('[data-testid="enter"]');
      const logo = rect(".topbar--over .wordmark__logo");
      return {
        viewportWidth: window.innerWidth,
        logoWidth: logo.width,
        logoHeight: logo.height,
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
    expect(layout.logoWidth).toBeGreaterThanOrEqual(viewport.width <= 640 ? 95 : 111);
    expect(layout.logoHeight).toBeGreaterThanOrEqual(viewport.width <= 640 ? 95 : 111);
    if (viewport.width <= 699) {
      expect(layout.copyTop).toBeGreaterThanOrEqual(layout.pictureBottom - 1);
      expect(layout.headingTop).toBeGreaterThanOrEqual(layout.pictureBottom - 1);
    }
    expect(layout.enterLeft).toBeGreaterThanOrEqual(0);
    expect(layout.enterRight).toBeLessThanOrEqual(viewport.width + 1);
    expect(layout.enterBottom).toBeLessThanOrEqual(layout.heroBottom + 1);

    if (viewport.width <= 699) {
      expect(layout.enterBottom).toBeLessThanOrEqual(viewport.height + 1);
    }
  });
}

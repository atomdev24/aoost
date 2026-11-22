import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bearer, draftSite, editorPassword, resetDraft, signIn } from "./helpers";

/**
 * Text over the hero artwork (22 Nov 2026): the four looks render over the reel and follow it as
 * it moves on: the handwritten line changes, the cut-out shows the new artwork, the artwork colour
 * changes. Screenshots go to docs/screenshots/hero-overlay.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/hero-overlay");

/** Artwork that exists on a test server (uploads live in production storage only). */
const REEL = [
  { src: "/art/hero.jpg", alt: "Studio piece", title: "Studio piece", date: "2025" },
  { src: "/art/grillz.jpg", alt: "Grillz", title: "Grillz", date: "Mar 2026" },
  { src: "/art/monkey-figure.jpg", alt: "Monkey figure", title: "Monkey figure", date: "Nov 2026" },
];
async function setOverlay(request: APIRequestContext, overlay: string) {
  const site = await draftSite(request, password!);
  const home = site.pages.find((p: { id: string }) => p.id === "home");
  for (const s of home.sections) for (const n of s.children) if (n.type === "AoostHero") Object.assign(n.content, { overlay, reelSeconds: 3, reel: REEL });
  const res = await request.post("/api/editor/ops", { headers: bearer(password!), data: { ops: [{ op: "putPage", page: home }] } });
  expect(res.ok()).toBe(true);
}
const open = async (page: Page) => {
  await page.goto("/preview/");
  await expect(page.locator(".hr-over")).toBeAttached();
};

test.describe("hero: text over the artwork", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.beforeEach(async ({ request, page }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  for (const size of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "phone", width: 390, height: 844 },
  ]) {
    test(`all four looks on ${size.name}`, async ({ page, request }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const clip = { x: 0, y: 0, width: size.width, height: size.name === "phone" ? 620 : 760 };

      await setOverlay(request, "difference");
      await open(page);
      await expect(page.locator(".ov-word")).toBeVisible();
      expect(await page.locator(".hr-over").evaluate((el) => getComputedStyle(el).mixBlendMode)).toBe("difference");
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${shots}/difference-${size.name}.png`, clip });

      await setOverlay(request, "tone");
      await open(page);
      // the colour is taken from the artwork once it has loaded
      await expect.poll(() => page.locator(".hr-over").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--tone"))).toMatch(/^#[0-9a-f]{6}$/i);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${shots}/tone-${size.name}.png`, clip });

      await setOverlay(request, "handwritten");
      await open(page);
      const lines = page.locator(".ov-hw");
      await expect(lines.nth(0)).toHaveClass(/\bon\b/);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${shots}/handwritten-${size.name}.png`, clip });
      // the reel moves on: the next line writes itself
      await expect(lines.nth(1)).toHaveClass(/\bon\b/, { timeout: 6000 });
      await expect(lines.nth(0)).not.toHaveClass(/\bon\b/);

      await setOverlay(request, "cutout");
      await open(page);
      const cut = page.locator(".ov-cut");
      const first = await cut.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--art"));
      expect(first).toContain("url(");
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${shots}/cutout-${size.name}.png`, clip });
      await expect.poll(() => cut.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--art")), { timeout: 6000 }).not.toBe(first);
      await expect(cut).toHaveText("Grillz");

      // Minimal: the artwork's own title and date, small, on the left, halfway down
      await setOverlay(request, "minimal");
      await open(page);
      await expect(page.locator(".ov-t")).toHaveText("Studio piece");
      await expect(page.locator(".ov-d")).toHaveText("2025");
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${shots}/minimal-${size.name}.png`, clip });
      await expect(page.locator(".ov-t")).toHaveText("Grillz", { timeout: 6000 });
      await expect(page.locator(".ov-d")).toHaveText("Mar 2026");
    });
  }
});

test.describe("hero: matte screen", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });
  test("shade, glare and grain sit over the artwork", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.setViewportSize({ width: 1440, height: 900 });
    const site = await draftSite(request, password!);
    const home = site.pages.find((p: { id: string }) => p.id === "home");
    for (const s of home.sections) for (const n of s.children) if (n.type === "AoostHero") Object.assign(n.content, { reel: REEL, overlay: "off", screen: { show: true } });
    expect((await request.post("/api/editor/ops", { headers: bearer(password!), data: { ops: [{ op: "putPage", page: home }] } })).ok()).toBe(true);
    await page.goto("/preview/");
    const layers = page.locator(".hr-screen i");
    await expect(layers).toHaveCount(3);
    expect(await layers.evaluateAll((els) => els.map((e) => getComputedStyle(e).mixBlendMode))).toEqual(["multiply", "screen", "screen"]);
    for (const f of ["shade", "glare", "grain"]) expect((await request.get(`/art/hero-screen-${f}.webp`)).ok()).toBe(true);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${shots}/matte-screen-desktop.png`, clip: { x: 0, y: 0, width: 1440, height: 760 } });
  });
});

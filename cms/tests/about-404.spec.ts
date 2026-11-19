import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * The About page draft (SHARE-VIEWER.md §4) and the clover 404 (§5).
 * Screenshots go to docs/screenshots/share-viewer.
 */
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/share-viewer");
const password = editorPassword();

test.describe("404: the clover", () => {
  for (const size of [
    { name: "1440", width: 1440, height: 900 },
    { name: "390", width: 390, height: 844 },
  ]) {
    test(`an unknown URL shows the clover and links back to / (${size.name})`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const res = await page.goto("/no-such-page-here");
      expect(res!.status()).toBe(404);
      await expect(page).toHaveTitle("aoost");
      const clover = page.locator("img.nf-clover");
      await expect(clover).toBeVisible();
      await expect(clover).toHaveJSProperty("complete", true);
      expect(await clover.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
      // its laid-out size (the turning makes the bounding box a little bigger)
      expect(await clover.evaluate((i: HTMLImageElement) => i.offsetWidth)).toBe(200);
      const box = (await clover.boundingBox())!;
      expect(Math.abs(box.x + box.width / 2 - size.width / 2)).toBeLessThan(2);
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");
      await expect(page.locator("body")).toHaveText(/^\s*404 · back\s*$/);
      const back = page.getByRole("link", { name: "back" });
      await expect(back).toHaveAttribute("href", "/");
      mkdirSync(shots, { recursive: true });
      await page.screenshot({ path: resolve(shots, `404-${size.name}.png`) });
      await back.click();
      await expect(page).toHaveURL(/\/$/);
    });
  }

  test("the clover keeps still under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/nothing/here");
    await expect(page.locator("img.nf-clover")).toHaveCSS("animation-name", "none");
  });
});

test.describe("About (draft preview)", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
  });

  test("the public site leaves the draft out", async ({ request }) => {
    expect((await request.get("/about")).status()).toBe(404);
  });

  for (const size of [
    { name: "1440", width: 1440, height: 900, px: "48px" },
    { name: "390", width: 390, height: 844, px: "30px" },
  ]) {
    test(`shows the line, the skills bars and the links (${size.name})`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto("/preview/about");
      await expect(page.locator(".ab-k")).toHaveText("aoost / about");
      const line = page.locator(".ab-line");
      await expect(line).toHaveText("Things I make, when I get to them.");
      await expect(line).toHaveCSS("font-weight", "300");
      await expect(line).toHaveCSS("font-size", size.px);
      expect(await line.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/^"?Lexend/);
      await expect(page.locator(".ab-by")).toHaveText("Alex · Cape Town");
      await expect(page.locator(".ab-rule")).toBeVisible();
      // the skills block from the homepage, bars and all
      await expect(page.locator(".skills h2")).toHaveText("Skills");
      expect(await page.locator(".skills .sk-bar").count()).toBeGreaterThan(3);
      await page.locator(".skills").scrollIntoViewIfNeeded();
      await expect(page.locator(".skills")).toHaveClass(/seen/);
      // the links from settings.socials
      const links = page.locator(".ab-links a");
      await expect(links).toHaveText(["Instagram", "Spotify"]);
      await expect(links.first()).toHaveAttribute("href", /instagram\.com/);
      // on the cutting mat
      expect(await page.locator(".mat.mat-light").count()).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: resolve(shots, `about-${size.name}.png`), fullPage: true });
    });
  }
});

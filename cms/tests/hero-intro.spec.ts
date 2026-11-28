import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bearer, draftSite, editorPassword, resetDraft, signIn } from "./helpers";

/**
 * The hero's opening: a blank screen, a dot, the clover in dots, the power-on line, then the
 * artwork. It covers the artwork (and hides the corner labels) while it plays, the reel waits,
 * and it clears itself. Reduced motion skips it; "once per visit" plays it once.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/hero-intro");

async function setIntro(request: APIRequestContext, intro: string) {
  const site = await draftSite(request, password!);
  const home = site.pages.find((p: { id: string }) => p.id === "home");
  for (const s of home.sections) for (const n of s.children) if (n.type === "AoostHero") Object.assign(n.content, { intro, screen: { show: true } });
  expect((await request.post("/api/editor/ops", { headers: bearer(password!), data: { ops: [{ op: "putPage", page: home }] } })).ok()).toBe(true);
}
const header = (page: Page) => page.locator("header.hero-rect");

test.describe("hero opening", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.setTimeout(60_000);
  test.beforeAll(() => mkdirSync(shots, { recursive: true }));
  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.context().route(/supabase\.co|jsdelivr/, (r) => r.abort());
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test.fixme("plays over the artwork, under the glass, with the labels hidden; then clears and the reel goes on", async ({ page, request }) => { // drifted; see ROADMAP "Tests to rewrite"
    await setIntro(request, "always");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/", { waitUntil: "domcontentloaded" });
    const cover = header(page).locator(":scope > .hr-intro");
    await expect(cover).toHaveClass(/is-playing/);
    const started = Date.now();
    const at = async (s: number) => { const wait = s * 1000 - (Date.now() - started); if (wait > 0) await page.waitForTimeout(wait); };
    await expect(cover.locator("canvas")).toHaveCount(1);
    await expect(header(page)).toHaveClass(/is-intro/);
    expect(Number(await header(page).locator(".hr-top").evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(0.05);
    // its place: after the artwork and the text over it, before the matte screen and the labels
    const order = await header(page).evaluate((h) => [...h.children].map((c) => c.className.split(" ")[0]));
    expect(order.indexOf("hr-intro")).toBeGreaterThan(order.indexOf("hr-track"));
    expect(order.indexOf("hr-intro")).toBeLessThan(order.indexOf("hr-screen"));
    // the clover in dots, then the line; the reel holds still while it plays
    await at(2.2);
    await page.screenshot({ path: `${shots}/clover.png`, clip: { x: 0, y: 0, width: 1440, height: 760 } });
    expect(await page.locator("#hrBar").evaluate((e) => parseFloat((e as HTMLElement).style.width) || 0)).toBe(0);
    await at(3.9);
    await page.screenshot({ path: `${shots}/line.png`, clip: { x: 0, y: 0, width: 1440, height: 760 } });
    await expect(cover).toHaveCount(1);
    expect(await page.locator("#hrBar").evaluate((e) => parseFloat((e as HTMLElement).style.width) || 0)).toBe(0);
    // it clears itself and the labels come back
    await expect(cover).toHaveCount(0, { timeout: 5000 });
    await expect(header(page)).not.toHaveClass(/is-intro/);
    await expect.poll(async () => Number(await header(page).locator(".hr-top").evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.95);
    await page.screenshot({ path: `${shots}/after.png`, clip: { x: 0, y: 0, width: 1440, height: 760 } });
    await expect.poll(async () => page.locator("#hrBar").evaluate((e) => parseFloat((e as HTMLElement).style.width) || 0), { timeout: 4000 }).toBeGreaterThan(0);
  });

  test("reduced motion goes straight to the artwork", async ({ page, request }) => {
    await setIntro(request, "always");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/preview/");
    await expect(header(page).locator(".hr-intro")).toHaveCount(0);
    expect(await header(page).locator(".hr-top").evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
  });

  test("'once per visit' plays the first time only", async ({ page, request }) => {
    await setIntro(request, "session");
    await page.goto("/preview/", { waitUntil: "domcontentloaded" });
    await expect(header(page).locator(".hr-intro.is-playing")).toHaveCount(1);
    await page.goto("/preview/");
    await expect(header(page).locator(".hr-intro")).toHaveCount(0);
  });

  test("off when set to off", async ({ page, request }) => {
    await setIntro(request, "off");
    await page.goto("/preview/");
    await expect(header(page).locator(".hr-intro")).toHaveCount(0);
  });
});

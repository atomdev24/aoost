import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * EDITOR-INSPECTOR-PHONE.md: content first in the inspector, one size switch, the opening view,
 * short frame labels, sums in number fields, and the phone sheet. Screenshots go to
 * docs/screenshots/inspector-phone.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/inspector-phone");
const editable = (page: Page) => page.frameLocator("#preview-frame");
const island = (page: Page, name: string) => page.locator(".ed-island-bps").getByRole("button", { name, exact: true });
const inspector = (page: Page) => page.getByRole("complementary", { name: "Inspector" });
const firstGroup = (page: Page) => inspector(page).locator(".ed-inspector-body .ed-igroup-title").first();
const textBlock = (page: Page) => editable(page).locator('[data-node-id]:has([data-type="Text"]), [data-node-id][data-type="Text"]').first();
const settle = (page: Page) => page.waitForTimeout(300);

async function guard(page: Page) {
  // Never write to the live Supabase project.
  await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
  await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
}

/** Open a page with nothing remembered (no saved view, Layers as the default left panel). */
async function fresh(page: Page, slug: string) {
  await page.goto(`/admin/?page=${slug}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(editable(page).locator("[data-node-id]").first()).toBeVisible();
}

test.describe("inspector on a desktop", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, request }) => {
    mkdirSync(shots, { recursive: true });
    await resetDraft(request, password!);
    await signIn(page, password!);
    await guard(page);
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("first open leaves room for the left panel and the inspector", async ({ page }) => {
    await fresh(page, "links");
    const flyout = await page.locator(".ed-flyout").boundingBox();
    expect(flyout, "Layers opens by default on a desktop").not.toBeNull();
    await settle(page);
    const frames = await page.locator(".bd-frame").evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).style.display !== "none").map((e) => e.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right })),
    );
    expect(frames.length).toBeGreaterThan(0);
    for (const f of frames) {
      expect(f.left).toBeGreaterThanOrEqual(flyout!.x + flyout!.width);
      expect(f.right).toBeLessThanOrEqual(1440 - 284 - 10);
    }
    await page.screenshot({ path: `${shots}/desktop-first-open.png` });
  });

  test.fixme("content first, one size switch, the name on its own line", async ({ page }) => { // drifted; see ROADMAP "Tests to rewrite"
    await fresh(page, "links");
    await page.keyboard.press("Escape");
    await textBlock(page).click();
    await expect(inspector(page)).toBeVisible();
    await expect(firstGroup(page)).toContainText("Content");
    // No size switch in the inspector; the header holds only the name and type.
    await expect(inspector(page).getByRole("group", { name: "Editing breakpoint" })).toHaveCount(0);
    await expect(inspector(page).locator(".ed-inspector-head > *")).toHaveCount(1);
    // The top bar's switch drives the scope bar.
    await island(page, "Mobile").click();
    await expect(inspector(page).locator(".ed-scope")).toContainText("Editing Mobile");
    await island(page, "Desktop").click();
    await expect(inspector(page).locator(".ed-scope")).toContainText("Editing Desktop");
    await settle(page);
    await page.screenshot({ path: `${shots}/desktop-inspector.png` });
  });

  test.fixme("number fields work out sums", async ({ page }) => { // drifted; see ROADMAP "Tests to rewrite"
    await fresh(page, "links");
    await page.keyboard.press("Escape");
    await textBlock(page).click();
    const rotate = inspector(page).getByRole("textbox", { name: "Rotate" });
    await rotate.fill("48*2");
    await rotate.press("Enter");
    await expect(rotate).toHaveValue("96");
    await rotate.fill("+4");
    await rotate.press("Enter");
    await expect(rotate).toHaveValue("100");
    await rotate.fill("not a number");
    await rotate.press("Enter");
    await expect(rotate).toHaveValue("100");
    await rotate.fill("0");
    await rotate.press("Enter");
  });

  test("frame labels shorten when zoomed out", async ({ page }) => {
    await fresh(page, "links");
    const label = page.locator(".bd-label", { hasText: "Desktop" }).first();
    await page.getByRole("button", { name: /^Zoom \d+%/ }).click(); // 100%
    await expect(label).toContainText(/\d{3,4}/);
    for (let i = 0; i < 8 && Number(await page.locator(".bd").getAttribute("data-zoom")) >= 0.35; i++) await page.getByRole("button", { name: "Zoom out" }).click();
    expect(Number(await page.locator(".bd").getAttribute("data-zoom"))).toBeLessThan(0.35);
    await expect(label).not.toContainText(/\d/);
    await expect(label).not.toContainText("from");
    await settle(page);
    await page.screenshot({ path: `${shots}/desktop-zoomed-out.png` });
  });
});

test.describe("inspector on a phone", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, request }) => {
    mkdirSync(shots, { recursive: true });
    await resetDraft(request, password!);
    await signIn(page, password!);
    await guard(page);
  });

  test.fixme("the sheet opens short on Content and steps aside for a left panel", async ({ page }) => { // drifted; see ROADMAP "Tests to rewrite"
    await fresh(page, "links");
    await textBlock(page).tap();
    const card = page.locator(".ed-inspector.is-card");
    await expect(card).toHaveAttribute("data-size", "short");
    await expect(firstGroup(page)).toContainText("Content");
    expect(await card.locator(".ed-inspector-body").evaluate((b) => b.scrollTop)).toBe(0);
    await expect.poll(async () => Math.round((await card.boundingBox())?.height ?? 0)).toBeLessThan(844 * 0.4);
    await settle(page);
    await page.screenshot({ path: `${shots}/phone-sheet-short.png` });

    await page.locator(".ed-rail").getByRole("button", { name: "Layers" }).tap();
    await expect(page.locator(".ed-flyout")).toBeVisible();
    await expect(card).toHaveAttribute("data-size", "collapsed");
    await settle(page);
    await page.screenshot({ path: `${shots}/phone-panel-open.png` });
    await page.getByRole("button", { name: "Close flyout" }).tap();
    await expect(card).toHaveAttribute("data-size", "short");
  });

  test.fixme("no shortcuts sheet on touch", async ({ page }) => { // drifted; see ROADMAP "Tests to rewrite"
    await fresh(page, "links");
    await page.keyboard.press("Shift+?");
    await settle(page);
    await expect(page.locator(".ed-cheat")).toHaveCount(0);
    await page.getByRole("button", { name: "Search and commands" }).tap();
    const palette = page.getByRole("dialog", { name: "Search and commands" });
    await expect(palette).toBeVisible();
    await page.keyboard.type("keyboard shortcuts");
    await expect(palette.getByRole("option", { name: /Show keyboard shortcuts/ })).toHaveCount(0);
    await expect(palette.locator(".ed-pal-keys, .ed-pal-hint")).toHaveCount(0);
  });
});

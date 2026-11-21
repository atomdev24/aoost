import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homeBlock } from "./content";

/**
 * Inside a sketchbook (SHARE-VIEWER.md §3): the book opens into the dark room as a two-page spread on
 * its own cover (one page on phones); → advances the counter; Esc closes.
 */
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/share-viewer");

const errors: string[] = [];
async function openBook(page: Page, n = 1) {
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
  await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
  await page.goto("/");
  const book = page.locator(`#jrShelf .jr:nth-child(${n})`);
  await book.scrollIntoViewIfNeeded();
  await book.click();
  const room = page.locator(".jv.jvr");
  await expect(room).toHaveClass(/on/);
  await expect(room).toHaveCSS("background-color", "rgb(12, 12, 13)");
  return room;
}

test.describe("sketchbook: spread in the dark room", () => {
  test.afterEach(() => {
    expect(errors).toEqual([]);
    errors.length = 0;
  });
  test("desktop shows two pages on the cover; → advances the counter; Esc closes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const room = await openBook(page);
    await expect(room.locator(".jvr-t")).toHaveText("sketchbook 1");
    await expect(room.locator(".jvr-sheet > .jvr-p")).toHaveCount(2);
    await expect(room.locator(".jvr-gutter")).toHaveCount(1);
    // the cover shows about 4px around the pages
    const book = (await room.locator(".jvr-book").boundingBox())!;
    const pages = (await room.locator(".jvr-pages").boundingBox())!;
    expect(Math.round(pages.x - book.x)).toBe(4);
    expect(Math.round(book.y + book.height - (pages.y + pages.height))).toBe(4);
    const total = await room.locator(".jvr-dot").count();
    await expect(room.locator(".jvr-ct")).toHaveText(/^1 \/ \d+$/);
    await expect(room.locator(".jvr-x")).toBeFocused();
    mkdirSync(shots, { recursive: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(shots, "sketchbook-1440.png") });
    await page.keyboard.press("ArrowRight");
    await expect(room.locator(".jvr-leaf.fwd")).toHaveCount(1); // the page flips over (about 450ms)
    await expect(room.locator(".jvr-leaf")).toHaveCount(0, { timeout: 2000 });
    await expect(room.locator(".jvr-ct")).toHaveText(total > 2 ? /^2–3 \/ \d+$/ : /^2 \/ \d+$/);
    await expect(room.locator(".jvr-dot").nth(1)).toHaveClass(/on/);
    await expect(room.locator(".jvr-sheet > .jvr-p")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await expect(page.locator(".jv")).toHaveCount(0, { timeout: 4000 });
  });

  test("phones show one page at a time with the same controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const room = await openBook(page);
    await expect(room.locator(".jvr-sheet > .jvr-p")).toHaveCount(1);
    await expect(room.locator(".jvr-ct")).toHaveText(/^1 \/ \d+$/);
    await expect(room.locator(".jvr-pv")).toBeVisible();
    await expect(room.locator(".jvr-nx")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(shots, "sketchbook-390.png") });
    await room.locator(".jvr-nx").click();
    await expect(room.locator(".jvr-ct")).toHaveText(/^2 \/ \d+$/);
    await expect(room.locator(".jvr-sheet > .jvr-p")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator(".jv")).toHaveCount(0, { timeout: 4000 });
  });

  test("a material cover shows round the spread, and reduced motion crossfades", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const shown = (homeBlock("AoostJournals").journals as { hidden?: boolean; material?: string }[]).filter((j) => !j.hidden);
    const k = shown.findIndex((j) => j.material === "kraft" || j.material === "leather");
    test.skip(k < 0, "no material cover on the published shelf");
    const mat = shown[k]!.material!;
    const room = await openBook(page, k + 1);
    await expect(room.locator(".jvr-book")).toHaveClass(new RegExp(`cv-${mat}`));
    await expect(room.locator(".jvr-sw")).toHaveClass(new RegExp(`cv-${mat}`));
    await page.keyboard.press("ArrowRight");
    await expect(room.locator(".jvr-ct")).toHaveText(/^2/);
    await expect(room.locator(".jvr-leaf")).toHaveCount(0);
  });
});

import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * On a phone a piece on the projects board waits for a press and hold before it lifts, so a swipe that
 * starts on a piece scrolls the page (review of 22 Nov 2026). A mouse still picks it up at once.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function board(page: Page) {
  await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
  await page.goto("/");
  const piece = page.locator(".table>.piece").nth(1);
  await piece.scrollIntoViewIfNeeded();
  await expect(piece.locator("img")).toHaveJSProperty("complete", true);
  await page.waitForTimeout(400);
  return piece;
}
const at = (piece: Locator) => piece.evaluate((el) => el.style.transform);
const touch = (piece: Locator, type: string, x: number, y: number) => piece.dispatchEvent(type, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, button: 0 });

test("a swipe that starts on a piece leaves it where it is, and the page can scroll", async ({ page }) => {
  const piece = await board(page);
  await expect(piece).toHaveCSS("touch-action", "pan-y pinch-zoom");
  const before = await at(piece);
  await touch(piece, "pointerdown", 100, 400);
  await touch(piece, "pointermove", 104, 360); // moved on before the hold: the page takes it
  await touch(piece, "pointermove", 106, 300);
  await touch(piece, "pointerup", 106, 300);
  await page.waitForTimeout(500);
  expect(await at(piece)).toBe(before);
  await expect(piece).not.toHaveClass(/lifted/);
  await expect(page.locator("#viewer")).toBeHidden();
});

test("press and hold lifts a piece, then it follows the finger", async ({ page }) => {
  const piece = await board(page);
  const before = await at(piece);
  await touch(piece, "pointerdown", 100, 400);
  await page.waitForTimeout(150);
  await expect(piece).not.toHaveClass(/lifted/); // not yet
  await page.waitForTimeout(300);
  await expect(piece).toHaveClass(/lifted/);
  await touch(piece, "pointermove", 140, 440);
  await touch(piece, "pointerup", 140, 440);
  await expect(piece).not.toHaveClass(/lifted/);
  await page.waitForTimeout(700);
  expect(await at(piece)).not.toBe(before);
  await expect(page.locator("#viewer")).toBeHidden(); // a move, not a tap
});

test("phone text and tap sizes", async ({ page }) => {
  await board(page);
  // anything read is at least 12 px
  const small = await page.evaluate(() =>
    [...document.querySelectorAll(".hr-top .label,.jr-cap b,.pl-track .pl-du,.pl-more,.ao-foot-line,.lb-head .label")]
      .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12)
      .map((e) => e.className),
  );
  expect(small).toEqual([]);
  // the logo and the track rows are at least 44 px; chips take taps 44 px tall
  const logo = await page.locator(".pill-logo").first().boundingBox();
  if (logo) expect(Math.round(logo.width)).toBeGreaterThanOrEqual(44);
  const rows = page.locator(".pl-track");
  if (await rows.count()) expect(await rows.first().evaluate((el) => (el as HTMLElement).offsetHeight)).toBeGreaterThanOrEqual(44); // offsetHeight: the band may still be scaled in
  const chips = page.locator(".pl-chip");
  if (await chips.count()) {
    const h = await chips.first().evaluate((el) => parseFloat(getComputedStyle(el, "::after").height));
    expect(h).toBeGreaterThanOrEqual(44);
  }
});

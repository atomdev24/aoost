import { expect, test, type Browser, type Page } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * Other people in the editor (site and CMS review, phase 3 without accounts): a second editor shows
 * as a face in the top bar, its pointer and selection appear on your board, picking the same block
 * warns you both, and the Activity tab lists what happened.
 */
const password = editorPassword();
const canvas = (page: Page) => page.frameLocator("#preview-frame");

async function open(browser: Browser, name: string, color: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signIn(page, password!);
  await page.goto("/admin/?page=sample");
  await page.evaluate(([n, c]) => localStorage.setItem("ed-comment-author", JSON.stringify({ name: n, color: c })), [name, color]);
  await page.reload();
  await expect(canvas(page).locator(".n-sample-title")).toBeVisible();
  await page.keyboard.press("Escape");
  return { ctx, page };
}

test.describe("presence", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");

  test.beforeEach(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("a second editor shows up: face, pointer, selection, soft lock, activity", async ({ browser }) => {
    const a = await open(browser, "Alex Oost", "#3B82F6");
    const b = await open(browser, "Sam Lee", "#E14B8A");

    // each sees the other's face in the top bar
    await expect(a.page.locator(".ed-pres-face", { hasText: "SL" })).toBeVisible({ timeout: 10_000 });
    await expect(b.page.locator(".ed-pres-face", { hasText: "AO" })).toBeVisible();

    // Sam's pointer over the canvas shows on Alex's board
    const title = canvas(b.page).locator(".n-sample-title");
    await title.hover();
    await expect(a.page.locator(".ed-pres-cur[data-name='Sam Lee']")).toBeVisible({ timeout: 5000 });

    // Sam selects the title: Alex sees an outline round it
    await title.click();
    await expect(a.page.locator(".ed-pres-box", { hasText: "Sam Lee" })).toBeVisible({ timeout: 5000 });

    // Alex picks the same block: a soft-lock note, and nothing is blocked
    await canvas(a.page).locator(".n-sample-title").click();
    await expect(a.page.locator(".ed-pres-lock")).toContainText("Sam Lee is working on this block too");
    await expect(b.page.locator(".ed-pres-lock")).toContainText("Alex Oost is working on this block too");

    // Sam leaves: the face goes
    await b.ctx.close();
    await expect(a.page.locator(".ed-pres-face")).toHaveCount(0, { timeout: 10_000 });

    // the Activity tab is there and loads
    await a.page.getByRole("button", { name: /comments/i }).first().click();
    await a.page.getByRole("tab", { name: "Activity" }).click();
    await expect(a.page.locator(".ed-cmts")).not.toContainText("Loading activity…");
    await a.ctx.close();
  });
});

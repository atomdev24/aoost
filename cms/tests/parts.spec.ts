import { expect, test } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * Faster opening, phase 1: panels and dialogs load after the board. A part that loads late
 * still works on first use; one whose file can't be fetched (an old tab after a deploy) is
 * retried once and then says so with a Reload button instead of leaving a blank panel.
 */
const password = editorPassword();

test.describe("parts that load after the board", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the panels work on first use, and the palette takes typing at once, and load in the background", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    const loaded: string[] = [];
    page.on("response", (r) => /\/admin\/assets\/(PagesPanel|PublishSheet|ThemePanel)-/.test(r.url()) && loaded.push(r.url()));
    await page.goto("/admin/?page=home");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect.poll(() => page.evaluate(() => performance.getEntriesByName("aoost:board").length)).toBe(1);
    // Not part of the start, then fetched in idle time.
    await expect.poll(() => loaded.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
    await page.getByRole("button", { name: "Pages", exact: true }).click();
    await expect(page.getByRole("button", { name: "New page" })).toBeVisible();
    // The palette is in the start-up file: ⌘K then typing at once keeps every letter.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Meta+k");
    await page.keyboard.type("history");
    await expect(page.getByRole("dialog").getByRole("option").first()).toContainText("history", { ignoreCase: true });
  });

  test("a part whose file won't load says so, with Reload", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    let tries = 0;
    await page.route(/\/admin\/assets\/PagesPanel-[^/]+\.js$/, (r) => {
      tries++;
      return r.abort();
    });
    await page.goto("/admin/?page=home");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Pages", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Pages panel couldn't load" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Reload the editor" })).toBeVisible();
    expect(tries).toBeGreaterThanOrEqual(1);
  });
});

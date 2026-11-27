import { expect, test, type Page } from "@playwright/test";
import { draftSite, editorPassword, onBoard, resetDraft, signIn } from "./helpers";

/** Fit takes in the variants beside the page; a few words can be made bigger or smaller. */
const password = editorPassword();
const editable = (page: Page) => page.frameLocator("#preview-frame");

test.describe("fit and text size", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/admin/?page=sample");
    await expect(editable(page).locator(".n-sample-title")).toBeVisible();
    await page.keyboard.press("Escape");
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("Fit shows the variant beside the page too", async ({ page }) => {
    await page.locator(".ed-switcher-btn").click();
    await page.getByRole("menuitem", { name: /New variant of/ }).click();
    await expect(page.locator(".ed-shell.is-variant")).toBeVisible();
    await expect(page.locator(".vr-frame")).not.toHaveCount(0);
    await page.getByRole("button", { name: "Fit all frames" }).click();
    await page.waitForTimeout(400);
    const right = await page.locator(".vr-frame").evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().right)));
    expect(right).toBeLessThanOrEqual(1440);
  });

  test("a few words in a text block can be made bigger", async ({ page, request }) => {
    const b = await onBoard(page, editable(page).locator(".n-sample-lede"));
    await page.mouse.dblclick(b.x + 20, b.y + 8);
    const bar = page.getByRole("toolbar", { name: "Text formatting" });
    await expect(bar).toBeVisible();
    await page.keyboard.press("ControlOrMeta+a");
    await bar.getByRole("button", { name: "Text size" }).click();
    await page.getByRole("dialog", { name: "Text size" }).getByRole("button", { name: /Huge/ }).click();
    await expect(bar.getByRole("button", { name: "Text size: Huge" })).toBeVisible();
    await bar.getByRole("button", { name: "Done" }).click();
    await expect
      .poll(async () => JSON.stringify((await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "sample")).includes('"size":"xxl"'))
      .toBe(true);
    await expect(editable(page).locator('.n-sample-lede span[style*="font-size: 2em"]').first()).toBeVisible();
  });
});

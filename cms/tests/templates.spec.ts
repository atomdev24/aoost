import { expect, test } from "@playwright/test";

/**
 * Templates in the demo: try two page designs on Home, lay them side by side,
 * use one, and the share link shows it.
 */
test.describe("demo templates", () => {
  test.beforeEach(async ({ request }) => {
    expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  });

  test("try designs on a page, compare them on the board, use one and share it", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/demo/");
    await page.getByRole("button", { name: "Got it" }).click();
    await page.getByRole("button", { name: "Templates", exact: true }).click();
    const panel = page.locator(".ed-tpl");
    await expect(panel.getByText("Brochures, photo hero")).toBeVisible({ timeout: 20_000 });
    await panel.locator(".ed-tpl-card").nth(0).getByRole("button", { name: /^Try on/ }).click();
    await expect(page.locator(".ed-variant-band")).toBeVisible();
    await panel.locator(".ed-tpl-card").nth(1).getByRole("button", { name: /^Try on/ }).click();
    await expect(panel.locator(".ed-tpl-designs li")).toHaveCount(3);
    await expect(page.locator("#preview-frame").contentFrame().getByText("Choose your crop")).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: "test-results/templates-editor.png" });

    await panel.getByRole("button", { name: "Compare side by side" }).click();
    const board = page.getByRole("dialog", { name: /Designs for/ });
    await expect(board.locator("iframe")).toHaveCount(3);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "test-results/templates-board.png" });

    await board.locator(".ed-dz-board").nth(1).getByRole("button", { name: "Use this one" }).click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/templates-after-use.png" });
    const link = board.locator(".ed-dz-done a");
    await expect(link).toBeVisible({ timeout: 30_000 });
    await expect(board.locator("iframe")).toHaveCount(1);
    const href = (await link.getAttribute("href"))!;
    expect(href).toContain("/demo/staging/");
    await page.screenshot({ path: "test-results/templates-chosen.png" });
    const shared = await page.context().newPage();
    await shared.setViewportSize({ width: 1440, height: 900 });
    await shared.goto(href);
    await expect(shared.getByText("See what TrueFruit can do for your crop this season")).toBeVisible();
    await expect(shared.getByText("TrueFruit for citrus")).toBeVisible();
    await shared.waitForTimeout(1500);
    await shared.screenshot({ path: "test-results/templates-shared.png", fullPage: true });
    await shared.setViewportSize({ width: 390, height: 844 });
    await shared.waitForTimeout(800);
    await shared.screenshot({ path: "test-results/templates-shared-phone.png", fullPage: true });
  });
});

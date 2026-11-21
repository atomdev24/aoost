import { expect, test } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * The nav in the editor: clicking it opens the Navigation panel; the frames show the nav as the site
 * will (no links to unpublished pages); an empty logo text leaves just the symbol.
 */
const password = editorPassword();
const editable = (page: import("@playwright/test").Page) => page.frameLocator("#preview-frame");

test.describe("nav in the editor", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/admin/");
    await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("clicking the nav opens its panel; an empty logo text leaves just the symbol, in the editor and on the site", async ({ page }) => {
    const nav = editable(page).locator(".nav .pill");
    await expect(nav).toBeVisible();
    // links only for published pages, as on the site
    const published = await page.evaluate(async () => {
      const r = await fetch("/api/editor/site");
      const site = (await r.json()).site;
      return site.pages.filter((p: { status: string; isHome?: boolean; showInNav: boolean }) => p.status === "published" && !p.isHome && p.showInNav).length;
    });
    if (!published) await expect(nav.locator(".pill-link")).toHaveCount(0);

    await nav.locator(".pill-logo").click();
    const panel = page.getByRole("textbox", { name: "Logo text" });
    await expect(panel).toBeVisible();
    await panel.fill("");
    await panel.press("Enter");
    await expect(nav.locator(".pill-logo")).toHaveClass(/mark-only/);
    await expect(nav.locator(".pill-logo svg")).toHaveCount(1);
    await expect(nav.locator(".pill-logo span")).toHaveCount(0);

    await page.goto("/preview/");
    await expect(page.locator(".nav .pill-logo")).toHaveClass(/mark-only/);
    await expect(page.locator(".nav .pill-logo")).toHaveAttribute("aria-label", "Home");
    await page.screenshot({ path: "test-results/nav-mark-only.png", clip: { x: 520, y: 0, width: 400, height: 90 } });
  });
});

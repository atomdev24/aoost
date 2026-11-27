import { expect, test } from "@playwright/test";
import { editorPassword, signIn } from "./helpers";

/** Toolbars: Liquid glass (default) on every floating bar, Frosted or Solid from the "…" menu. */
const password = editorPassword();

test.describe("toolbar glass", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("liquid on every bar by default; Frosted and Solid from the menu", async ({ page }) => {
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/admin/?page=sample");
    await page.keyboard.press("Escape");
    // Chrome draws liquid glass: islands, rail and zoom bar all get it.
    await expect.poll(() => page.locator(".ed-liquid").count()).toBeGreaterThanOrEqual(5);
    for (const sel of [".ed-island", ".ed-rail", ".bd-zoombar"]) await expect(page.locator(`${sel}.ed-liquid`).first()).toBeAttached();
    await page.screenshot({ path: test.info().outputPath("liquid.png") });

    await page.getByRole("button", { name: "More", exact: true }).first().click();
    await expect(page.getByRole("menuitemradio", { name: "Liquid glass" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("menuitemradio", { name: "Frosted glass" }).click();
    await expect(page.locator(".ed-liquid")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-ed-glass", "frosted");
    await expect(page.locator(".ed-island").first()).not.toHaveCSS("backdrop-filter", "none");
    await page.getByRole("menuitemradio", { name: "Solid" }).click();
    await expect(page.locator("html")).toHaveClass(/ed-no-glass/);
    expect(await page.evaluate(() => localStorage.getItem("aoost.glassStyle"))).toBe("solid");
    await page.getByRole("menuitemradio", { name: "Liquid glass" }).click();
    await expect.poll(() => page.locator(".ed-liquid").count()).toBeGreaterThanOrEqual(5);
    await page.screenshot({ path: test.info().outputPath("menu.png") });
  });
});

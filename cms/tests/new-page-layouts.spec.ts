import { expect, test } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";

/** New page offers eight starting layouts drawn as line wireframes; empty pictures are soft grey with an icon. */
const password = editorPassword();

test.describe("new page layouts", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });
  for (const size of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
    test(`pick a layout and make the page (${size.w})`, async ({ page, request }) => {
      await resetDraft(request, password!);
      await page.setViewportSize({ width: size.w, height: size.h });
      await signIn(page, password!);
      await page.goto("/admin/?page=sample");
      await page.evaluate(() => localStorage.clear());
      await page.goto("/admin/?page=sample");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Pages", exact: true }).first().click();
      await page.getByRole("button", { name: /New page/ }).first().click();
      const dialog = page.getByRole("dialog");
      for (const n of ["Blank", "Landing page", "Product", "Pricing", "About", "Contact", "Article", "Event"]) await expect(dialog.getByRole("button", { name: n, exact: true })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Gallery", exact: true })).toHaveCount(0);
      await page.screenshot({ path: test.info().outputPath("modal.png") });
      await dialog.getByRole("textbox").first().fill("Spring launch");
      await dialog.getByRole("button", { name: "Landing page", exact: true }).click();
      await dialog.getByRole("button", { name: /Create page/ }).click();
      const frame = page.frameLocator("#preview-frame");
      await expect(frame.getByRole("heading", { name: "Spring launch" })).toBeVisible();
      await expect(frame.locator(".frame-empty").first()).toBeVisible();
      await expect(frame.locator(".frame-empty").first()).not.toHaveCSS("border-top-style", "dashed");
      await page.waitForTimeout(600);
      await page.screenshot({ path: test.info().outputPath("page.png") });
    });
  }
});

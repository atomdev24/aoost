import { expect, test } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";
test.use({ viewport: { width: 1440, height: 900 } });
test("variant frames get pictures", async ({ page, request }) => {
  test.setTimeout(90000);
  await resetDraft(request, editorPassword()!);
  await signIn(page, editorPassword()!);
  await page.goto(`/admin/?page=sample`);
  await expect(page.frameLocator("#preview-frame").locator("main h1").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".ed-switcher-btn").click();
  await page.getByRole("menuitem", { name: /New variant of/ }).click();
  await expect(page.locator(".ed-shell.is-variant")).toBeVisible();
  await page.getByRole("button", { name: "Fit all frames" }).click();
  await expect.poll(() => page.locator(".vr-frame.is-still .bd-still canvas").count(), { timeout: 20000 }).toBeGreaterThan(0);

  await page.screenshot({ path: test.info().outputPath("v.png") });
  // a click on a variant's picture opens that version
  await page.locator(".vr-frame .bd-still").first().click();
  await expect(page.locator(".ed-shell.is-variant")).toHaveCount(0);
});

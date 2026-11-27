import { expect, test } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";

/** Collections open from the rail as a full-screen table; an empty site offers the examples. */
const password = editorPassword();

test.describe("collections", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("opens from the rail and starts from an example", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.locator(".ed-rail").getByRole("button", { name: "Collections", exact: true }).click();
    const view = page.getByRole("dialog", { name: /Collections/ }).or(page.locator(".ed-cms, .cv, [data-collections]")).first();
    await expect(view).toBeVisible();
    await page.getByRole("button", { name: /Start with Success stories/ }).click();
    await expect(page.getByRole("row")).not.toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("collections.png") });
    await page.getByRole("button", { name: "Back to the canvas" }).click();
    await expect(page.getByRole("button", { name: "Back to the canvas" })).toBeHidden();
  });
});

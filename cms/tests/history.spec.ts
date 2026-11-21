import { expect, test } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * Undo and redo while editing a field in the inspector. ⌘Z in a page field is the editor's undo
 * (not the browser's field undo, which put the typing back on a second ⌘Z), and redo reaches the
 * canvas even with the same block still selected (it was taken for the echo of the canvas edit).
 */
const password = editorPassword();

test.describe("undo and redo from the inspector", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("typing, ⌘Z ⌘Z ⌘Z, then ⇧⌘Z: undone once and stays undone, redone everywhere", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const editable = page.frameLocator("#preview-frame");
    const mobile = page.frameLocator('.bd-live[data-bp="mobile"]');
    await editable.locator(".n-sample-title").click();
    const field = page.locator(".ed-inspector input[type=text], .ed-inspector textarea").first();
    const before = await field.inputValue();
    await field.click();
    await field.press("Meta+ArrowRight");
    await field.pressSequentially(" again", { delay: 25 });
    await expect(editable.locator(".n-sample-title")).toContainText(`${before} again`);

    for (let i = 0; i < 3; i++) await page.keyboard.press("Meta+z");
    await expect(field).toHaveValue(before);
    await expect(editable.locator(".n-sample-title")).not.toContainText("again");
    await expect(mobile.locator(".n-sample-title")).not.toContainText("again");

    await page.keyboard.press("Meta+Shift+z");
    await expect(field).toHaveValue(`${before} again`);
    await expect(editable.locator(".n-sample-title")).toContainText(`${before} again`);
    await expect(mobile.locator(".n-sample-title")).toContainText(`${before} again`);
  });
});

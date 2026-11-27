import { expect, test } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * A calmer board: each version has one header line (where it starts) with an eye that folds it
 * into a thin strip; moving sections get a grey line in the margin; the zoom bar's Show menu
 * turns those marks (and comments, variant changes, screen-size edits) off and on.
 */
const password = editorPassword();

test.describe("board clarity", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("version headers fold, motion lines and the Show menu", async ({ page, request }) => {
    test.setTimeout(90_000);
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/admin/?page=sample");
    await expect(page.frameLocator("#preview-frame").locator("main h1").first()).toBeVisible();
    await page.keyboard.press("Escape");

    // The sample page moves (scroll effects), so its sections get grey margin lines, not badges in the page.
    await expect.poll(() => page.locator(".ed-motion-line").count()).toBeGreaterThan(0);

    // A variant: two headers, the one being edited can't be hidden.
    await page.locator(".ed-switcher-btn").click();
    await page.getByRole("menuitem", { name: /New variant of/ }).click();
    await expect(page.locator(".ed-shell.is-variant")).toBeVisible();
    await page.getByRole("button", { name: "Fit all frames" }).click();
    await page.getByRole("button", { name: "Zoom out" }).click();
    await page.getByRole("button", { name: "Zoom out" }).click();
    const heads = page.locator(".vr-head-line");
    await expect(heads).toHaveCount(2);
    await expect(heads.filter({ hasText: "Variant 1" })).toContainText("editing");
    await expect(page.locator(".vr-head-line.is-current .vr-eye")).toBeDisabled();

    // Fold the page: a thin strip, no frame names, and the eye brings it back.
    const pageEye = page.locator(".vr-head-line.is-owner .vr-eye");
    await pageEye.click();
    await expect(page.locator(".vr-folded")).toHaveCount(1);
    await expect(page.locator(".vr-head-line.is-owner")).toHaveClass(/is-hidden/);
    // The new-variant button sits after the folded header, not on it.
    const head = (await page.locator(".vr-head-line.is-owner").boundingBox())!;
    const add = (await page.locator(".vr-new").boundingBox())!;
    expect(add.x).toBeGreaterThanOrEqual(head.x + head.width);
    await page.screenshot({ path: test.info().outputPath("folded.png") });
    await pageEye.click();
    await expect(page.locator(".vr-folded")).toHaveCount(0);

    // Show menu: motion lines off and on again; the choice is remembered.
    await page.getByRole("button", { name: /^Show/ }).click();
    const motion = page.getByRole("menuitemcheckbox", { name: /Motion/ });
    await motion.click();
    await expect(motion).toHaveAttribute("aria-checked", "false");
    await expect(page.locator(".ed-motion-line:visible")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("aoost.marks"))).toContain('"motion":false');
    await motion.click();
    await expect.poll(() => page.locator(".ed-motion-line:visible").count()).toBeGreaterThan(0);
  });
});

import { expect, test } from "@playwright/test";
import { bearer, draftSite, draftWithAllPagesLive, editorPassword, signIn } from "./helpers";

/**
 * Variants and staging: make a variant of a page, edit it while the page stays as it was,
 * elect it into staging, open the share link signed out, and push (refused on a test server).
 */
const password = editorPassword();

test.describe("variants and staging", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("variant → elect → staging link → push", async ({ page, request, browser }) => {
    await draftWithAllPagesLive(request, password!);
    await request.delete("/api/editor/staging?forget=1", { headers: bearer(password!) });
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const editable = page.frameLocator("#preview-frame");
    // A variant's blocks get fresh ids, so find the title by what it is.
    const title = (f: { locator: (s: string) => ReturnType<typeof page.locator> }) => f.locator("main h1").first();
    const original = (await title(editable).innerText()).trim();

    // New variant from the page switcher: the band says what you're on, the frames turn purple.
    await page.locator(".ed-switcher-btn").click();
    await page.getByRole("menuitem", { name: /New variant of/ }).click();
    const band = page.getByRole("region", { name: "Variant" });
    await expect(band).toBeVisible();
    await expect(band.getByLabel("Variant name")).toHaveValue("Variant 1");
    await expect(page.locator(".ed-shell.is-variant")).toBeVisible();
    await expect(page.locator(".ed-switcher-variant")).toHaveText("Variant 1");

    // Edit the variant; the page itself is untouched.
    await title(editable).click();
    const field = page.locator(".ed-inspector input[type=text], .ed-inspector textarea").first();
    await field.click();
    await field.press("Meta+ArrowRight");
    await field.pressSequentially(" from staging", { delay: 20 });
    await expect(title(editable)).toContainText("from staging");
    await expect
      .poll(async () => {
        const site = await draftSite(request, password!);
        const sample = site.pages.find((p: { id: string }) => p.id === "sample");
        const variant = site.pages.find((p: { variantOf?: string }) => p.variantOf === "sample");
        return [JSON.stringify(sample.sections).includes("from staging"), JSON.stringify(variant?.sections ?? "").includes("from staging")];
      })
      .toEqual([false, true]);

    // The variant never shows on the public preview of the page.
    // Elect: its content goes onto the page, the variant goes, the draft goes to staging.
    await band.getByRole("button", { name: "Elect to staging" }).click();
    await expect(band).toBeHidden();
    const link = page.getByLabel("Staging link");
    await expect(link).toBeVisible();
    await expect(page.locator(".ed-staging-head")).toContainText("Sample");
    await expect(page.locator(".ed-staging-chip")).toBeVisible();
    const url = await link.inputValue();
    expect(url).toMatch(/\/staging\/[\w-]{16,}\/$/);
    await expect
      .poll(async () => {
        const site = await draftSite(request, password!);
        return [site.pages.some((p: { variantOf?: string }) => p.variantOf), JSON.stringify(site.pages.find((p: { id: string }) => p.id === "sample").sections).includes("from staging")];
      })
      .toEqual([false, true]);

    // The share link works for someone who isn't signed in.
    const visitor = await browser.newContext();
    const v = await visitor.newPage();
    const slug = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "sample").slug;
    const res = await v.goto(url.replace(/\/$/, "") + slug);
    expect(res?.status()).toBe(200);
    await expect(title(v)).toContainText(`${original} from staging`);
    await expect(v.getByText("Staging preview")).toBeVisible();
    expect((await v.goto(url.replace(/[\w-]{16,}\/$/, "notthetoken0000000000/")))?.status()).toBe(404);

    // Push to production goes through the publish lock on a test server.
    await page.getByRole("button", { name: "Push to production" }).click();
    await expect(page.locator(".ed-sheet-error").first()).toContainText("Publishing is off on a local test server");

    // Emptying staging turns the link off.
    await page.getByRole("button", { name: "Empty staging" }).click();
    await expect(link).toBeHidden();
    expect((await v.goto(url))?.status()).toBe(404);
    await visitor.close();
  });
});

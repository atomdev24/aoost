import { expect, test } from "@playwright/test";
import { bearer, draftSite, draftWithAllPagesLive, editorPassword, signIn } from "./helpers";

/**
 * Version history. A test server has no GitHub token (it must never publish), so the panel
 * says history isn't available; the restore path runs against a stubbed history.
 */
const password = editorPassword();

test.describe("version history", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("without GitHub, the panel says history isn't available here", async ({ page, request }) => {
    await draftWithAllPagesLive(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(page.locator(".ed-versions")).toContainText("works on the live editor");
  });

  test("restore puts an older version in the draft and in staging, not live", async ({ page, request }) => {
    await draftWithAllPagesLive(request, password!);
    await request.delete("/api/editor/staging?forget=1", { headers: bearer(password!) });
    const now = await draftSite(request, password!);
    const older = JSON.parse(JSON.stringify(now).replace("Dust and neon.", "Dust and neon, an older take."));
    const a = "a".repeat(40);
    const b = "b".repeat(40);
    await page.route("**/api/editor/history", (r) =>
      r.fulfill({
        json: {
          ok: true,
          versions: [
            { sha: a, at: new Date().toISOString(), message: "Push to production: Home: Variant 1", who: "alex" },
            { sha: b, at: new Date(Date.now() - 86400_000).toISOString(), message: "Publish from the editor: content/pages/sample.json", who: null },
          ],
        },
      }),
    );
    await page.route("**/api/editor/history/version?sha=*", (r) => r.fulfill({ json: { ok: true, site: older } }));
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "History", exact: true }).click();
    const list = page.getByRole("list", { name: "Versions" });
    await expect(list.locator("li").first()).toContainText("Pushed Home: Variant 1");
    await expect(list.locator("li").first()).toContainText("Live");
    await expect(list.locator("li").nth(1)).toContainText("Published Sample");
    await expect(list.locator("li").first().getByRole("button", { name: /Restore/ })).toHaveCount(0);
    await expect(list.locator("li").nth(1).getByRole("link", { name: /Preview/ })).toHaveAttribute("href", `/preview/_version/${b}/`);

    page.once("dialog", (d) => void d.accept()); // the draft has unpublished changes
    await list.locator("li").nth(1).getByRole("button", { name: /Restore/ }).click();
    await expect(page.getByLabel("Staging link")).toBeVisible();
    await expect(page.locator(".ed-staging-head")).toContainText("Restore: Published Sample");
    await expect(page.frameLocator("#preview-frame").locator("main h1").first()).toContainText("an older take");
    await expect.poll(async () => JSON.stringify(await draftSite(request, password!)).includes("an older take")).toBe(true);
    // ⌘Z takes the restore back out of the draft.
    await page.locator(".ed-sheet-head button").click();
    await page.keyboard.press("Meta+z");
    await expect(page.frameLocator("#preview-frame").locator("main h1").first()).not.toContainText("an older take");
  });
});

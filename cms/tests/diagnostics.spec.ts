import { expect, test } from "@playwright/test";
import { bearer, editorPassword, signIn } from "./helpers";

/**
 * Keeping the editor whole and reporting what goes wrong:
 * - a refresh after a deploy loads the new build (the page is never served stale from the cache);
 * - if part of the editor fails to load, it reloads itself once and notes why;
 * - "Report a problem" and the problem log are in the "…" menu, and a report carries the last 60 s, taken when it opens;
 * - the glass toolbars can be switched off (and stay off) for graphics setups that flicker.
 */
const password = editorPassword();
type Item = { kind: string; message: string; detail?: string };
const log = async (request: import("@playwright/test").APIRequestContext) => (await (await request.get("/api/editor/problems", { headers: bearer(password!) })).json()).items as Item[];

test.describe("editor diagnostics", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1512, height: 900 } });

  test("the editor's build file failing to load (an old build after a deploy): it reloads once, draws its toolbars, and notes it", async ({ page, request }) => {
    await request.delete("/api/editor/problems", { headers: bearer(password!) });
    await signIn(page, password!);
    let blocked = 0;
    await page.route(/\/admin\/assets\/index-[\w-]+\.js$/, (route) => (blocked++ === 0 ? route.fulfill({ status: 404, contentType: "text/html", body: "<!doctype html>gone" }) : route.continue()));
    await page.goto("/admin/?page=home");
    await expect(page.locator(".ed-island-right")).toBeVisible({ timeout: 20_000 });
    expect(blocked).toBeGreaterThanOrEqual(2);
    await expect.poll(async () => (await log(request)).some((p) => /build file failed to load/.test(p.message)), { timeout: 15_000 }).toBe(true);
  });

  test("the … menu has Report a problem and the log; a report carries what happened before it was opened", async ({ page, request }) => {
    await request.delete("/api/editor/problems", { headers: bearer(password!) });
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.waitForSelector(".bd-frame-active iframe");
    // Some activity for the recording: a zoom.
    const bd = (await page.locator(".bd").boundingBox())!;
    await page.mouse.move(bd.x + bd.width / 2, bd.y + bd.height / 2);
    await page.keyboard.down("Control");
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -6);
    await page.keyboard.up("Control");
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("menuitem", { name: "Report a problem…" }).click();
    await page.getByLabel("What happened?").fill("Toolbar blinked while zooming");
    await page.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByText("Saved to the problem log")).toBeVisible();
    await expect.poll(async () => (await log(request)).find((p) => p.kind === "report")?.detail ?? "").toMatch(/Last 60 s/);
    const detail = (await log(request)).find((p) => p.kind === "report")!.detail!;
    expect(detail).toMatch(/board moving \(zoom/);
    expect(detail).toMatch(/Now: top bar left: shown/);
    const text = await (await request.get("/api/editor/problems?format=text", { headers: bearer(password!) })).text();
    expect(text).toMatch(/Last 60 s/);

    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("menuitem", { name: "Problem log" }).click();
    await expect(page.getByRole("dialog", { name: "Problem log" })).toContainText("Toolbar blinked while zooming");
    await request.delete("/api/editor/problems", { headers: bearer(password!) });
  });

  test("glass toolbars switch off, stay off after a reload, and switch back on", async ({ page }) => {
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.waitForSelector(".ed-island-right");
    const blur = () => page.locator(".ed-island-right").evaluate((e) => getComputedStyle(e).backdropFilter);
    expect(await blur()).toContain("blur");
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: /Glass toolbars/ }).click();
    await expect.poll(blur).toBe("none");
    await page.reload();
    await page.waitForSelector(".ed-island-right");
    expect(await blur()).toBe("none");
    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: /Glass toolbars/ })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("menuitemcheckbox", { name: /Glass toolbars/ }).click();
    await expect.poll(blur).toContain("blur");
  });
});

test.describe("editor service worker", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ serviceWorkers: "allow", viewport: { width: 1512, height: 900 } });

  test("a stale page in the cache never wins over the live one (a refresh after a deploy loads the new build)", async ({ page }) => {
    await signIn(page, password!);
    await page.goto("/admin/");
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true);
    // Pretend an older build's page is what the cache holds.
    await page.evaluate(async () => {
      for (const k of await caches.keys()) if (k.startsWith("aoost-editor-") && k !== "aoost-editor-assets") await (await caches.open(k)).put("/admin/", new Response("<!doctype html><title>stale</title><p id=stale>old build</p>", { headers: { "Content-Type": "text/html" } }));
    });
    await page.reload();
    await expect(page.locator("#stale")).toHaveCount(0);
    await expect(page.locator(".ed-island-right")).toBeVisible({ timeout: 20_000 });
  });
});

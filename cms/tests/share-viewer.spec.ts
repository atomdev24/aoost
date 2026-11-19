import { expect, test, type Page } from "@playwright/test";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bearer, draftSite, editorPassword, resetDraft, signIn } from "./helpers";

/**
 * The dark-room artwork viewer (SHARE-VIEWER.md §2): open a piece, → turns and the counter follows,
 * the "i" shows only for pieces with plaque text, Esc closes. Screenshots go to docs/screenshots/share-viewer.
 */
const here = dirname(fileURLToPath(import.meta.url));
const shots = resolve(here, "../../docs/screenshots/share-viewer");
const password = editorPassword();

async function quiet(page: Page) {
  // Never write to the live Supabase project.
  await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
  await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
}

async function openPiece(page: Page, n: number) {
  const piece = page.locator(`.table>.piece:nth-child(${n})`);
  await expect(piece.locator("img")).toHaveJSProperty("complete", true);
  await piece.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#viewer")).toBeVisible();
}

test.describe("artwork viewer: the dark room", () => {
  test.beforeEach(async ({ page }) => quiet(page));

  test("opens a piece, → goes to the next, no plaque without plaque text, Esc closes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const total = await page.locator(".table>.piece").count();
    expect(total).toBeGreaterThan(1);
    await openPiece(page, 1);
    await expect(page.locator("#vCount")).toHaveText(`1 / ${total}`);
    await expect(page.locator("#viewer")).toHaveCSS("background-color", "rgb(12, 12, 13)");
    await expect(page.locator("#vClose")).toBeFocused();
    await expect(page.locator("#vInfo")).toBeHidden();
    await expect(page.locator("#vPlaque")).toBeHidden();

    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#vCount")).toHaveText(`2 / ${total}`);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#vCount")).toHaveText(`${total} / ${total}`);

    // Focus stays in the room.
    for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("#viewer"))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(page.locator("#viewer")).toBeHidden();
  });

  test("tapping a piece opens it too, and the arrows turn", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const piece = page.locator(".table>.piece:nth-child(3)");
    await piece.scrollIntoViewIfNeeded();
    await expect(piece.locator("img")).toHaveJSProperty("complete", true);
    await piece.dispatchEvent("pointerdown", { pointerId: 1, clientX: 10, clientY: 10, isPrimary: true });
    await piece.dispatchEvent("pointerup", { pointerId: 1, clientX: 10, clientY: 10, isPrimary: true });
    await expect(page.locator("#vCount")).toHaveText(/^3 \/ \d+$/);
    await page.locator("#vNext").click();
    await expect(page.locator("#vCount")).toHaveText(/^4 \/ \d+$/);
    await page.locator("#vClose").click();
    await expect(page.locator("#viewer")).toBeHidden();
  });

  test.describe("with a plaque set", () => {
    test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");

    test.beforeEach(async ({ page, request }) => {
      await resetDraft(request, password!);
      const site = await draftSite(request, password!);
      const home = site.pages.find((p: { id: string }) => p.id === "home");
      for (const s of home.sections) for (const n of s.children) if (n.type === "AoostProjects") Object.assign(n.content.projects[1], { title: "Blue monkey", medium: "Ink", year: "2025", note: "Drawn on the train home." });
      const res = await request.post("/api/editor/ops", { headers: bearer(password!), data: { ops: [{ op: "putPage", page: home }] } });
      expect(res.ok()).toBe(true);
      await signIn(page, password!);
    });
    test.afterAll(async ({ request }) => {
      await resetDraft(request, password!);
    });

    for (const size of [
      { name: "1440", width: 1440, height: 900 },
      { name: "390", width: 390, height: 844 },
    ]) {
      test(`the "i" shows only on the piece with a plaque (${size.name})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/preview/");
        await openPiece(page, 1);
        await expect(page.locator("#vInfo")).toBeHidden();
        mkdirSync(shots, { recursive: true });
        await page.screenshot({ path: resolve(shots, `viewer-${size.name}.png`) });

        await page.keyboard.press("ArrowRight");
        await expect(page.locator("#vCount")).toHaveText(/^2 \//);
        await expect(page.locator("#vInfo")).toBeVisible();
        await expect(page.locator("#vPlaque")).toBeHidden();
        await page.locator("#vInfo").click();
        await expect(page.locator("#vPlaque")).toBeVisible();
        await expect(page.locator("#vPlaque .vp-t")).toHaveText("Blue monkey");
        await expect(page.locator("#vPlaque .vp-m")).toHaveText("Ink, 2025");
        await expect(page.locator("#vPlaque .vp-n")).toHaveText("Drawn on the train home.");
        await page.screenshot({ path: resolve(shots, `viewer-plaque-${size.name}.png`) });

        await page.keyboard.press("ArrowRight");
        await expect(page.locator("#vInfo")).toBeHidden();
        await expect(page.locator("#vPlaque")).toBeHidden();
        await page.keyboard.press("Escape");
        await expect(page.locator("#viewer")).toBeHidden();
      });
    }
  });

  test("the share image is served", async ({ request }) => {
    const res = await request.get("/og.png");
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("image/png");
    expect((await request.get("/favicon.ico")).ok()).toBe(true);
    expect((await request.get("/apple-touch-icon.png")).ok()).toBe(true);
    mkdirSync(shots, { recursive: true });
    copyFileSync(resolve(here, "../static/og.png"), resolve(shots, "og-image.png"));
  });
});

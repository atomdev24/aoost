import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { editorPassword, mcpCall, resetDraft, signIn } from "./helpers";

/**
 * EDITOR-PHONE-PALETTE.md: the command palette (⌘K), shortcuts, the cheat sheet,
 * the editor on a phone, and the home-screen app's manifest. Screenshots go to
 * docs/screenshots/phone-palette.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/phone-palette");
const editable = (page: Page) => page.frameLocator("#preview-frame");
const island = (page: Page, name: string) => page.locator(".ed-island-bps").getByRole("button", { name, exact: true });
const palette = (page: Page) => page.getByRole("dialog", { name: "Search and commands" });
/** Screenshots after the overlays' short fade-in. */
const settle = (page: Page) => page.waitForTimeout(300);

async function guard(page: Page) {
  // Never write to the live Supabase project, and never publish for real.
  await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
  await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
}

test.describe("command palette and shortcuts", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await guard(page);
    await page.goto("/admin/?page=about");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(editable(page).locator("[data-node-id]").first()).toBeVisible();
    await page.keyboard.press("Escape"); // close the remembered (unpinned) flyout
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("⌘K opens the palette, typing publish runs it, Esc closes it", async ({ page }) => {
    mkdirSync(shots, { recursive: true });
    let published = 0;
    await page.route("**/api/editor/publish", (route) => {
      published++;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, commit: null, url: null, changed: [] }) });
    });
    // Something recent to show: a block.
    await editable(page).locator("[data-node-id]").nth(1).click();
    await expect(page.locator(".ed-inspector")).toBeVisible();

    await page.keyboard.press("ControlOrMeta+k");
    await expect(palette(page)).toBeVisible();
    await expect(palette(page).locator(".ed-pal-heading").first()).toHaveText("Recent");
    await expect(palette(page).locator(".ed-pal-heading").nth(1)).toHaveText("Actions");
    await expect(palette(page).getByRole("option", { name: /Publish/ })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: `${shots}/palette-empty.png` });

    await page.keyboard.type("publish");
    await expect(palette(page).getByRole("option").first()).toContainText("Publish");
    await page.keyboard.press("Enter");
    await expect(palette(page)).toHaveCount(0);
    await expect.poll(() => published).toBe(1);

    await page.keyboard.press("ControlOrMeta+k");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette(page)).toHaveCount(0);
  });

  test("a sentence asks Claude through the editor context", async ({ page, request }) => {
    // The connector has been used just now, so Claude counts as connected.
    await mcpCall(request, password!, "list_pages");
    await page.keyboard.press("ControlOrMeta+k");
    await page.keyboard.type("make the about text a bit warmer");
    const top = palette(page).getByRole("option").first();
    await expect(top).toContainText("Ask Claude to do this");
    await settle(page);
    await page.screenshot({ path: `${shots}/palette-ask-claude.png` });
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(palette(page)).toHaveCount(0);
    await expect(page.locator(".ed-asked")).toContainText("make the about text a bit warmer");
    await expect
      .poll(async () => {
        const res = await mcpCall(request, password!, "get_editor_context");
        return JSON.parse(res.content[0]!.text!).request?.text ?? null;
      })
      .toBe("make the about text a bit warmer");
  });

  test("/ opens quick insert, ⌘2 shows Desktop, ? shows the cheat sheet", async ({ page }) => {
    await page.keyboard.press("/");
    await expect(page.getByRole("dialog", { name: "Quick insert" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Quick insert" })).toHaveCount(0);

    await page.keyboard.press("ControlOrMeta+4");
    await expect(island(page, "Mobile")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ControlOrMeta+2");
    await expect(island(page, "Desktop")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.bd-frame-active[data-bp="desktop"]')).toBeVisible();

    await page.keyboard.press("?");
    const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(sheet).toBeVisible();
    for (const group of ["Palette and help", "Tools", "Canvas", "Blocks", "Panels", "History and publishing"]) await expect(sheet.getByRole("region", { name: group })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: `${shots}/cheat-sheet.png` });
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);

    // Single letters never fire while typing in a field.
    await page.keyboard.press("ControlOrMeta+k");
    await page.keyboard.type("l");
    await expect(page.locator(".ed-flyout")).toHaveCount(0);
    await page.keyboard.press("Escape");
    // …but do on the canvas: L toggles Layers.
    await page.keyboard.press("l");
    await expect(page.locator('.ed-flyout[data-panel="layers"]')).toBeVisible();
  });
});

test.describe("the editor on a phone", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await guard(page);
  });

  test("opens on the Mobile frame fitted to the screen; a tap selects and the inspector card expands", async ({ page }) => {
    mkdirSync(shots, { recursive: true });
    await page.goto("/admin/?page=about");
    await expect(editable(page).locator("[data-node-id]").first()).toBeVisible();
    await expect(island(page, "Mobile")).toHaveAttribute("aria-pressed", "true");
    // Fitted: the Mobile frame spans the screen between the rail and the right edge.
    await expect
      .poll(async () => {
        const box = await page.locator('.bd-frame-active[data-bp="mobile"]').boundingBox();
        return box ? [Math.round(box.x), Math.round(box.width)] : null;
      })
      .toEqual([64, 318]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    // Touch targets: every island and rail button is at least 40px.
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".ed-island button, .ed-rail button")]
        .filter((b) => b.offsetParent)
        .map((b) => b.getBoundingClientRect())
        .filter((r) => r.width < 40 || r.height < 40).length,
    );
    expect(small).toBe(0);

    await editable(page).locator("[data-node-id]").nth(1).tap();
    const card = page.locator(".ed-inspector.is-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-size", "half");
    await settle(page);
    await page.screenshot({ path: `${shots}/phone-editor.png` });
    await page.getByRole("button", { name: "Expand the inspector" }).tap();
    await expect(card).toHaveAttribute("data-size", "full");
    await expect.poll(async () => (await card.boundingBox())?.height ?? 0).toBeGreaterThan(650);
    await settle(page);
    await page.screenshot({ path: `${shots}/phone-inspector-full.png` });

    // The palette opens from the search icon in the left island.
    await page.getByRole("button", { name: "Search and commands" }).tap();
    await expect(palette(page)).toBeVisible();
    await settle(page);
    await page.screenshot({ path: `${shots}/phone-palette.png` });
  });
});

test.describe("home-screen app", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ serviceWorkers: "allow" });

  test("the manifest is served with its icons, and the editor links it", async ({ page, request }) => {
    const res = await request.get("/admin/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m).toMatchObject({ name: "aoost", display: "standalone", background_color: "#161618", theme_color: "#161618", start_url: "/admin/" });
    expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512", "1024x1024"]);
    for (const icon of [...m.icons.map((i: { src: string }) => i.src), "/admin/app-icon-180.png"]) {
      const r = await request.get(icon);
      expect(r.status(), icon).toBe(200);
      expect(r.headers()["content-type"]).toContain("image/png");
    }

    await signIn(page, password!);
    await guard(page);
    await page.goto("/admin/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/admin/manifest.webmanifest");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/admin/app-icon-180.png");
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "black-translucent");
    // The service worker installs and never answers API requests from its cache.
    await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration("/admin/"))?.active), { timeout: 15_000 }).toBe(true);
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const urls: string[] = [];
      for (const k of keys) for (const r of await (await caches.open(k)).keys()) urls.push(new URL(r.url).pathname);
      return urls;
    });
    expect(cached).toContain("/admin/");
    expect(cached.filter((u) => u.startsWith("/api/"))).toEqual([]);
  });
});

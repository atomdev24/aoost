import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clearArea, draftSite, editorPassword, mcpCall, onBoard, resetDraft, signIn } from "./helpers";

/**
 * Editor Sections 2 and 3: inspector controls (dense rows, scrubbing, colour,
 * alignment, per-breakpoint overrides, media) and adding things and feedback
 * (block library, / quick insert, media library, publish, loading and empty
 * states). Screenshots go to docs/screenshots/editor-section2-3.
 * Publishing is always mocked: these tests never commit to GitHub.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/editor-section2-3");
const editable = (page: Page) => page.frameLocator("#preview-frame");
const rail = (page: Page, name: string) => page.locator(".ed-rail").getByRole("button", { name, exact: true });
const flyout = (page: Page) => page.locator(".ed-flyout");
const inspector = (page: Page) => page.locator(".ed-inspector");
const title = (page: Page) => page.locator(".ed-inspector-title strong");

async function homeSections(request: Parameters<typeof draftSite>[0]) {
  const home = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "home");
  return home.sections as { id: string; name?: string; layout: { base: Record<string, unknown>; desktop?: Record<string, unknown> }; children: { id: string; type: string; content: Record<string, unknown> }[] }[];
}

/** Select a top-level layer (a homepage section) from the Layers flyout, then close the flyout. */
async function selectLayer(page: Page, name: string) {
  if (!(await flyout(page).isVisible()) || (await flyout(page).getAttribute("data-panel")) !== "layers") await rail(page, "Layers").click();
  await page.locator(".ed-layer-name", { hasText: name }).first().click();
  await expect(title(page)).toHaveText(name);
  await page.keyboard.press("Escape");
  await expect(flyout(page)).toHaveCount(0);
}

/** Click a block on the canvas (the middle of its visible part). */
async function selectOnCanvas(page: Page, selector: string) {
  const b = await onBoard(page, editable(page).locator(selector).first());
  const area = await clearArea(page);
  const x = (Math.max(b.x, area.left) + Math.min(b.x + b.width, area.right)) / 2;
  const y = (Math.max(b.y, area.top) + Math.min(b.y + b.height, area.bottom)) / 2;
  await page.mouse.click(x, y);
}

const toMobile = (page: Page) => page.locator(".ed-island-bps").getByRole("button", { name: "Mobile" }).click();

/** A few files in the (local) media library: four pictures and a short video made in the browser. */
async function seedMedia(page: Page): Promise<{ name: string; url: string }[]> {
  return page.evaluate(async () => {
    const list = async () => ((await (await fetch("/api/editor/media")).json()).items ?? []) as { name: string; url: string }[];
    const have = new Set((await list()).map((i) => i.name));
    for (const n of ["hero.jpg", "grillz.jpg", "flower-skull.png", "storefront.png", "monkey-figure.jpg"]) {
      if (have.has(n)) continue;
      const b = await (await fetch(`/art/${n}`)).blob();
      const bm = await createImageBitmap(b);
      const f = new FormData();
      f.set("file", new File([b], n, { type: b.type }));
      f.set("width", String(bm.width));
      f.set("height", String(bm.height));
      await fetch("/api/editor/media", { method: "POST", body: f });
    }
    if (!have.has("loop.webm")) {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 180;
      const ctx = c.getContext("2d")!;
      const r = new MediaRecorder(c.captureStream(30), { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.start(100);
      let t = 0;
      const iv = setInterval(() => {
        ctx.fillStyle = `hsl(${t++ * 12},60%,45%)`;
        ctx.fillRect(0, 0, 320, 180);
      }, 33);
      await new Promise((ok) => setTimeout(ok, 1000));
      clearInterval(iv);
      await new Promise((ok) => {
        r.onstop = ok;
        r.stop();
      });
      const f = new FormData();
      f.set("file", new File([new Blob(chunks, { type: "video/webm" })], "loop.webm", { type: "video/webm" }));
      await fetch("/api/editor/media", { method: "POST", body: f });
    }
    return list();
  });
}

/** Put an Image block on Home, right under the hero (draft only; reset after each test). */
async function addPhoto(request: Parameters<typeof draftSite>[0], src: string) {
  const r = await mcpCall(request, password!, "add_section", { page: "home", kind: "flow", name: "Photo", index: 1, nodes: [{ type: "Image", name: "Photo", content: { src, alt: "A drawing" }, style: { height: "320px" } }] });
  expect(r.isError).toBeFalsy();
}

async function openEditor(page: Page, query = "") {
  await page.goto(`/admin/${query}`);
  await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
  await page.keyboard.press("Escape");
}

test.describe("editor sections 2 and 3", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeAll(() => mkdirSync(shots, { recursive: true }));
  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    // Never write to the live Supabase project, and never publish for real.
    await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
    await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
    await page.context().route("**/api/editor/publish", (route) => route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, error: "GitHub didn't accept the commit (test)." }) }));
    await page.goto("/admin/");
    await page.evaluate(() => localStorage.clear());
    await openEditor(page);
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("scrubbing a number changes it, and one undo puts it back", async ({ page, request }) => {
    await selectLayer(page, "Projects");
    const input = inspector(page).getByLabel("Padding vertical");
    const before = Number(await input.inputValue());
    const glyph = inspector(page).locator(".ed-scrub", { has: page.getByLabel("Padding vertical") }).locator(".ed-scrub-glyph");
    const g = (await glyph.boundingBox())!;
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(g.x + g.width / 2 + i * 3, g.y + g.height / 2);
    await page.mouse.up();
    await expect(input).toHaveValue(String(before + 10));
    await expect.poll(async () => (await homeSections(request)).find((s) => s.id === "home-projects")!.layout.desktop?.padding).toBe(`${before + 10}px 0px`); // a desktop edit is a desktop override
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(input).toHaveValue(String(before));
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    // Arrow keys step by one; Esc puts back what was typed.
    await input.press("ArrowUp");
    await expect(input).toHaveValue(String(before + 1));
    await input.fill("99");
    await input.press("Escape");
    await expect(input).toHaveValue(String(before + 1));
  });

  test("the colour format switch round-trips the value", async ({ page }) => {
    await selectLayer(page, "Projects");
    await inspector(page).getByRole("button", { name: "Background colour: open colour picker" }).click();
    const picker = page.locator(".ed-picker");
    await expect(picker).toBeVisible();
    const hex = picker.getByLabel("Hex value");
    await hex.fill("0A84FF");
    await hex.press("Enter");
    await expect(inspector(page).getByLabel("Background colour", { exact: true })).toHaveValue("0A84FF");
    await picker.getByLabel("Colour format").selectOption("rgb");
    await expect(picker.getByLabel("RGB value")).toHaveValue("10, 132, 255");
    await picker.getByLabel("Colour format").selectOption("hsl");
    await expect(picker.getByLabel("HSL value")).toHaveValue("210, 100%, 52%");
    await picker.getByLabel("Colour format").selectOption("hex");
    await expect(picker.getByLabel("Hex value")).toHaveValue("0A84FF");
    await expect(inspector(page).getByLabel("Background colour", { exact: true })).toHaveValue("0A84FF");
    // The last format is remembered.
    expect(await page.evaluate(() => localStorage.getItem("aoost.colorFormat"))).toBe("hex");
    await expect(picker.getByText("Site colours")).toBeVisible();
    await expect(picker.getByText("On this page")).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/02-colour-popover.png` });
  });

  test("the alignment grid and the fine controls stay in sync", async ({ page }) => {
    await selectLayer(page, "Projects");
    await inspector(page).getByRole("button", { name: "More alignment options" }).click();
    await inspector(page).getByRole("button", { name: "Align bottom right" }).click();
    await expect(inspector(page).getByRole("group", { name: "Justify" }).getByRole("button", { name: "End" })).toHaveAttribute("aria-pressed", "true");
    await expect(inspector(page).getByRole("group", { name: "Items" }).getByRole("button", { name: "Bottom" })).toHaveAttribute("aria-pressed", "true");
    await inspector(page).getByRole("group", { name: "Justify" }).getByRole("button", { name: "Centre" }).click();
    await expect(inspector(page).getByRole("button", { name: "Align bottom centre" })).toHaveAttribute("aria-pressed", "true");
    await expect(inspector(page).getByRole("button", { name: "Align bottom right" })).toHaveAttribute("aria-pressed", "false");
    // Open stays open after a reload.
    expect(await page.evaluate(() => localStorage.getItem("aoost.alignMore"))).toBe("1");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/03-alignment-fine-controls.png` });
  });

  test("Reset to desktop and Reset all remove mobile overrides", async ({ page, request }) => {
    await selectLayer(page, "Projects");
    await toMobile(page);
    const scope = page.locator(".ed-scope");
    await expect(scope).toHaveText(/Editing Mobile · 0 changes/);
    const pv = inspector(page).getByLabel("Padding vertical");
    await pv.fill("24");
    await pv.press("Enter");
    const gap = inspector(page).getByLabel("Gap");
    await gap.fill("12");
    await gap.press("Enter");
    await expect(scope).toHaveText(/Editing Mobile · 2 changes/);
    await expect(scope).toHaveClass(/is-override/);
    await expect(inspector(page).locator(".ed-cell.is-over")).toHaveCount(2);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/01-inspector-mobile-overrides.png` });

    await inspector(page).locator(".ed-label.is-over", { hasText: "Padding" }).click();
    await expect(page.getByRole("menu")).toContainText("Desktop: 0px");
    await page.getByRole("menuitem", { name: "Reset to desktop" }).click();
    await expect(scope).toHaveText(/1 change/);
    await expect(inspector(page).locator(".ed-label.is-over", { hasText: "Padding" })).toHaveCount(0);

    await scope.getByRole("button", { name: "Reset all" }).click();
    await expect(scope).toHaveText(/0 changes/);
    await expect(inspector(page).locator(".ed-label.is-over")).toHaveCount(0);
    await expect.poll(async () => (await homeSections(request)).find((s) => s.id === "home-projects")!.layout).toEqual({ base: { columns: 1, gap: 0, padding: "0px" } });
    // Reset all was one step.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(scope).toHaveText(/1 change/);
  });

  test("/ inserts a block below the selection", async ({ page, request }) => {
    await selectLayer(page, "Projects");
    await page.keyboard.press("/");
    const palette = page.getByRole("dialog", { name: "Quick insert" });
    await expect(palette).toBeVisible();
    await page.keyboard.type("text");
    await expect(palette.getByRole("option", { selected: true })).toContainText("Text");
    await expect(palette).toContainText("Adds below Projects");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${shots}/07-quick-insert.png` });
    await page.keyboard.press("Enter");
    await expect(palette).toHaveCount(0);
    await expect(title(page)).toHaveText("Text");
    await expect
      .poll(async () => {
        const sections = await homeSections(request);
        const i = sections.findIndex((s) => s.id === "home-projects");
        return sections[i + 1]?.children[0]?.type;
      })
      .toBe("Text");
    // Esc closes it without adding anything.
    await page.keyboard.press("Escape");
    await page.keyboard.press("/");
    await expect(palette).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
  });

  test("the Unused filter shows only files nothing uses", async ({ page, request }) => {
    const media = await seedMedia(page);
    const used = media.find((m) => m.name === "grillz.jpg")!;
    await addPhoto(request, used.url);
    await openEditor(page);
    await rail(page, "Media").click();
    const items = flyout(page).locator(".ed-masonry-item");
    await expect(items).toHaveCount(media.length);
    await expect(flyout(page).locator('.ed-masonry-item[data-used="true"]')).toHaveCount(1);
    await expect(flyout(page).locator('.ed-masonry-item[data-used="true"] .ed-used-dot')).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${shots}/08-media-masonry.png` });
    await flyout(page).getByRole("tab", { name: "Unused" }).click();
    await expect(items).toHaveCount(media.length - 1);
    await expect(flyout(page).locator('[data-used="true"]')).toHaveCount(0);
    await flyout(page).getByRole("tab", { name: "All" }).click();
    await flyout(page).getByRole("button", { name: "List view" }).click();
    await expect(flyout(page).locator(".ed-medialist li", { hasText: used.name })).toContainText("used on: Home");
    await expect(flyout(page).locator(".ed-medialist li", { hasText: "storefront.png" })).toContainText("not used");
    expect(await page.evaluate(() => localStorage.getItem("aoost.media.view"))).toBe("list");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${shots}/09-media-list.png` });
  });

  test("a failed publish opens the sheet at the failed step", async ({ page }) => {
    await selectLayer(page, "Projects");
    const gap = inspector(page).getByLabel("Gap");
    await gap.fill("12");
    await gap.press("Enter");
    await expect(page.locator(".ed-savedot")).toHaveAttribute("data-state", "saved");
    await expect(page.locator(".ed-publish-badge")).toHaveText("1");
    await page.locator(".ed-publish-btn").click();
    const sheet = page.getByRole("dialog", { name: "Publish details" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('li[data-step="github"]')).toHaveClass(/is-failed/);
    await expect(sheet.locator('li[data-step="rebuild"]')).toHaveClass(/is-todo/);
    await expect(sheet.getByRole("alert")).toContainText("GitHub didn't accept the commit");
    await expect(sheet.getByRole("button", { name: "Retry" })).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/10b-publish-failed.png` });
  });

  test("screenshots: image popover, adjust mode, insert flyout, publish sheet", async ({ page, request }) => {
    await addPhoto(request, "/art/hero.jpg");
    await openEditor(page);
    const photo = 'img.media[src*="hero"]';
    await selectOnCanvas(page, photo);
    await expect(title(page)).toHaveText("Photo");
    await inspector(page).locator(".ed-mediarow-main").first().click();
    await expect(page.locator(".ed-mediapop")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${shots}/04-image-popover.png` });
    await page.keyboard.press("Escape");

    // Adjust image: double-click the picture, scale with the wheel, drag it.
    const b = await onBoard(page, editable(page).locator(photo).first());
    await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
    const hit = page.locator(".ed-adjust-hit");
    await expect(hit).toBeVisible();
    const h = (await hit.boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.wheel(0, -160);
    await page.mouse.down();
    await page.mouse.move(h.x + h.width / 2 + 30, h.y + h.height / 2 + 20, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator(".ed-adjust-tag")).toContainText("%");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${shots}/05-image-adjust.png` });
    await page.keyboard.press("Escape");
    await expect(hit).toHaveCount(0);

    await rail(page, "Insert").click();
    await expect(flyout(page).locator(".ed-card").first()).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${shots}/06-insert-flyout.png` });
    await page.keyboard.press("Escape");

    await expect(page.locator(".ed-savedot")).toHaveAttribute("data-state", "saved");
    await page.locator(".ed-publish-badge").click();
    await expect(page.getByRole("dialog", { name: "Publish details" })).toContainText("Home");
    // the changed page is checked at phone size before publishing (review, 22 Nov 2026)
    const checks = page.locator(".ed-checks");
    await expect(checks).toHaveAttribute("aria-busy", "false", { timeout: 20000 });
    await expect(checks.locator("li")).toHaveCount(5);
    await expect(checks.locator('li[data-check="spill"]')).toHaveClass(/is-ok/);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/10-publish-sheet.png` });
  });

  test("screenshots: new empty page and loading snapshot", async ({ page, request }) => {
    const made = await mcpCall(request, password!, "create_page", { name: "Field notes", template: "blank", show_in_nav: false });
    const id = JSON.parse(made.content[0]!.text!.split("\n(")[0]!).id as string;
    await openEditor(page, `?page=${id}`);
    const start = page.getByRole("region", { name: "Start this page" });
    await expect(start).toBeVisible();
    await expect(start).toContainText("Journal entry");
    await expect(start).toContainText("Press / to add a block, or drop an image");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${shots}/11-new-empty-page.png` });
    await start.getByRole("button", { name: "Journal entry" }).click();
    await expect(start).toHaveCount(0);
    await expect(editable(page).locator(".n").first()).toBeVisible();

    // Home leaves a snapshot behind after it loads; the next visit shows it while loading.
    await openEditor(page);
    await expect
      .poll(() => page.evaluate(() => new Promise<string[]>((ok) => {
        const r = indexedDB.open("aoost-editor", 1);
        r.onsuccess = () => {
          const q = r.result.transaction("snapshots").objectStore("snapshots").getAllKeys();
          q.onsuccess = () => ok(q.result as string[]);
        };
        r.onerror = () => ok([]);
      })), { timeout: 40_000 })
      .toEqual(expect.arrayContaining(["home:desktop", "home:mobile"]));
    await page.goto("/admin/?snapshot=hold");
    await expect(page.locator(".bd-loading-chip")).toContainText("Loading latest…");
    await expect(page.locator(".bd-cover img").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${shots}/12-loading-snapshot.png` });
  });
});

import { expect, test, type Page } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { draftSite, editorPassword, mcpCall, onBoard, resetDraft, signIn } from "./helpers";

const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/editor-redesign");

/**
 * The side-by-side breakpoint board: Desktop and Mobile frames of one draft,
 * linked selection, per-breakpoint edits, zoom and Fit all.
 */
const password = editorPassword();
const editable = (page: Page) => page.frameLocator("#preview-frame");
const live = (page: Page, bp: "desktop" | "mobile") => page.frameLocator(`.bd-live[data-bp="${bp}"]`);
const bpSwitch = (page: Page, name: "Desktop" | "Mobile") => page.locator(".ed-island-bps").getByRole("button", { name });
const zoomPct = async (page: Page) => Number((await page.locator(".bd-zoom-pct").textContent())!.replace("%", ""));
type Layout = { base: Record<string, unknown>; desktop?: Record<string, unknown> };
const sectionLayout = async (request: Parameters<typeof draftSite>[0], id: string): Promise<Layout> =>
  (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "sample").sections.find((s: { id: string }) => s.id === id).layout;

/** A grid section whose mobile and desktop columns start out the same (3), made the way Claude would. */
async function addTestGrid(page: Page, request: Parameters<typeof draftSite>[0]): Promise<string> {
  const added = await mcpCall(request, password!, "add_section", { page: "sample", kind: "grid", name: "Test grid", index: 1, layout: { columns: 3 }, nodes: [{ type: "Text", content: { text: "Cell one" } }, { type: "Text", content: { text: "Cell two" } }] });
  const id = /"sectionId":\s*"([^"]+)"/.exec(added.content[0]!.text!)![1]!;
  // Select it from the layers list; the board pans to it.
  await page.locator(".ed-rail").getByRole("button", { name: "Layers", exact: true }).click();
  await page.locator(".ed-layer-name", { hasText: "Test grid" }).click();
  await expect(page.locator(".ed-inspector-title strong")).toHaveText("Test grid");
  return id;
}

test.describe("breakpoint board", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(editable(page).locator(".n-sample-title")).toBeVisible();
    await expect(live(page, "mobile").locator(".n-sample-title")).toBeVisible();
    await page.keyboard.press("Escape"); // close the default (unpinned) Layers flyout so the frames are clear
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("selecting a block in the mobile frame highlights it in the desktop frame", async ({ page }) => {
    const box = await onBoard(page, live(page, "mobile").locator(".n-sample-title"));
    await page.mouse.click(box.x + 10, box.y + 10);
    // Mobile is now the editable frame, the inspector follows, and Desktop shows the same block outlined.
    await expect(bpSwitch(page, "Mobile")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => editable(page).locator("html").evaluate((el) => el.ownerDocument.defaultView!.innerWidth)).toBe(390);
    await expect(page.locator(".ed-inspector-title span")).toContainText("Text");
    await expect(live(page, "desktop").locator(".n-sample-title")).toHaveCSS("outline-color", "rgb(10, 132, 255)");
    await expect(live(page, "desktop").locator(".n-sample-lede")).not.toHaveCSS("outline-color", "rgb(10, 132, 255)");
    // And the other way round: click a block in the Desktop frame.
    const lede = await onBoard(page, live(page, "desktop").locator(".n-sample-lede"));
    await page.mouse.click(lede.x + 10, lede.y + 10);
    await expect(bpSwitch(page, "Desktop")).toHaveAttribute("aria-pressed", "true");
    await expect(live(page, "mobile").locator(".n-sample-lede")).toHaveCSS("outline-color", "rgb(10, 132, 255)");
  });

  test("changing columns while Mobile is active writes only the mobile override and tints the field", async ({ page, request }) => {
    const id = await addTestGrid(page, request);
    await bpSwitch(page, "Mobile").click();
    const columnsLabel = page.locator(".ed-inspector .ed-label.is-over", { hasText: "Columns" });
    await expect(columnsLabel).toHaveCount(0);
    await page.getByRole("group", { name: "Split into columns" }).getByRole("button", { name: "2", exact: true }).click();
    await expect.poll(async () => {
      const l = await sectionLayout(request, id);
      return [l.base.columns, l.desktop?.columns];
    }).toEqual([2, 3]);
    await expect(columnsLabel).toBeVisible();
    await expect(page.locator(".ed-scope")).toContainText(/Editing Mobile · \d+ changes?/);
    await expect(page.locator(".bd-badge")).toContainText("override");
    // Desktop still shows three columns; Mobile shows two.
    await expect(live(page, "desktop").locator(`.s#${id} > .si`)).toHaveCSS("grid-template-columns", /^(\S+\s){2}\S+$/);
    await expect(editable(page).locator(`.s#${id} > .si`)).toHaveCSS("grid-template-columns", /^\S+\s\S+$/);
  });

  test("Reset to desktop removes the override", async ({ page, request }) => {
    const id = await addTestGrid(page, request);
    await bpSwitch(page, "Mobile").click();
    await page.getByRole("group", { name: "Split into columns" }).getByRole("button", { name: "2", exact: true }).click();
    await expect.poll(async () => (await sectionLayout(request, id)).base.columns).toBe(2);
    await page.locator(".ed-inspector .ed-label.is-over", { hasText: "Columns" }).click();
    await page.getByRole("menuitem", { name: "Reset to desktop" }).click();
    await expect.poll(async () => {
      const l = await sectionLayout(request, id);
      return [l.base.columns, l.desktop?.columns];
    }).toEqual([3, undefined]);
    await expect(page.locator(".ed-inspector .ed-label.is-over", { hasText: "Columns" })).toHaveCount(0);
  });

  test("text edits show up in both frames", async ({ page }) => {
    const box = await onBoard(page, editable(page).locator(".n-sample-title"));
    await page.mouse.click(box.x + 20, box.y + 20);
    await page.locator(".ed-inspector textarea:visible").first().fill("Same words, every frame.");
    await expect(editable(page).locator(".n-sample-title")).toHaveText("Same words, every frame.");
    await expect(live(page, "mobile").locator(".n-sample-title")).toHaveText("Same words, every frame.");
  });

  test("zoom and Fit all work, and the view is remembered per page", async ({ page }) => {
    // The first fit can happen before the frames have measured their pages, so fit again once they have.
    await page.getByRole("button", { name: "Fit all" }).click();
    const fitted = await zoomPct(page);
    expect(fitted).toBeGreaterThan(10);
    expect(fitted).toBeLessThan(60);
    // Fit all: every frame and the breakpoint slot sit inside the board.
    const board = (await page.locator(".bd").boundingBox())!;
    for (const sel of ['.bd-frame[data-bp="desktop"]', '.bd-frame[data-bp="mobile"]', ".bd-slot"]) {
      const b = (await page.locator(sel).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(board.x);
      expect(b.x + b.width).toBeLessThanOrEqual(board.x + board.width);
    }

    await page.getByRole("button", { name: "Zoom in" }).click();
    expect(await zoomPct(page)).toBeGreaterThan(fitted);
    await page.keyboard.press("ControlOrMeta+0");
    await expect(page.locator(".bd-zoom-pct")).toHaveText("100%");
    await page.getByRole("button", { name: "Zoom out" }).click();
    await expect(page.locator(".bd-zoom-pct")).toHaveText("75%");
    const desktopWidth = (await page.locator('.bd-frame[data-bp="desktop"]').boundingBox())!.width;
    expect(Math.round(desktopWidth)).toBe(1080);

    // Remembered after a reload…
    await page.waitForTimeout(400);
    await page.reload();
    await expect(page.locator(".bd-zoom-pct")).toHaveText("75%");
    // …until Fit all.
    await page.getByRole("button", { name: "Fit all" }).click();
    await expect.poll(() => zoomPct(page)).toBe(fitted);
  });

  test("the add-a-breakpoint slot is there but not yet available", async ({ page }) => {
    const slot = page.locator(".bd-slot");
    await expect(slot).toHaveAttribute("aria-disabled", "true");
    await expect(slot).toHaveAttribute("title", "Coming soon: tablet and custom widths");
  });
});

test.describe("editor screenshots for the docs", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Home open at 1440×900: fitted, and with a block selected on Mobile", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    // Never write to the live Supabase project from a test.
    await page.context().route(/supabase\.co|cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
    await page.goto("/admin/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(editable(page).locator('.ao-b[data-ao="projects"] h2')).toBeVisible();
    await expect(live(page, "mobile").locator('.ao-b[data-ao="projects"]')).toBeVisible();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${shots}/editor-home-1440.png` });

    const b = await onBoard(page, live(page, "mobile").locator('.ao-b[data-ao="projects"] h2'));
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect(bpSwitch(page, "Mobile")).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Fit all" }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${shots}/editor-home-mobile-selected-1440.png` });
    await resetDraft(request, password!);
  });
});

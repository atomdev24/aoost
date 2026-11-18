import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * Editor Section 1 (workspace frame): floating islands, icon rail and flyouts,
 * the inspector that appears on selection, free frame arrangement, the dot
 * grid and the name tag. Screenshots go to docs/screenshots/editor-section1.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/editor-section1");
const editable = (page: Page) => page.frameLocator("#preview-frame");
const rail = (page: Page, name: string) => page.locator(".ed-rail").getByRole("button", { name, exact: true });
const flyout = (page: Page) => page.locator(".ed-flyout");
const layerRows = (page: Page) => page.locator(".ed-layers > li");

/** Somewhere on the board with nothing under it: the gap between the Desktop and Mobile frames. */
async function emptyCanvas(page: Page) {
  const desktop = (await page.locator('.bd-frame[data-bp="desktop"]').boundingBox())!;
  const mobile = (await page.locator('.bd-frame[data-bp="mobile"]').boundingBox())!;
  return { x: (desktop.x + desktop.width + mobile.x) / 2, y: 500 };
}
/** A top-level layer row by its exact name. */
const layerNamed = (page: Page, name: string) => page.locator(".ed-layer-name").filter({ has: page.locator("span", { hasText: new RegExp(`^${name}$`) }) });

async function selectLayer(page: Page, name: string) {
  if (!(await flyout(page).isVisible()) || (await flyout(page).getAttribute("data-panel")) !== "layers") await rail(page, "Layers").click();
  await page.locator(".ed-layer-name", { hasText: name }).first().click();
  await expect(page.locator(".ed-inspector-title strong")).toHaveText(name);
}

test.describe("editor section 1", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeAll(() => mkdirSync(shots, { recursive: true }));
  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("screenshots of the workspace states", async ({ page }) => {
    // Nothing selected: no inspector, no flyout.
    await page.keyboard.press("Escape");
    await expect(flyout(page)).toHaveCount(0);
    await expect(page.locator(".ed-inspector")).toHaveCount(0);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${shots}/1-nothing-selected.png` });

    // A block selected: the inspector floats in on the right.
    await selectLayer(page, "Projects");
    await page.keyboard.press("Escape"); // closes the unpinned flyout, keeps the selection
    await expect(flyout(page)).toHaveCount(0);
    await expect(page.locator(".ed-inspector")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${shots}/2-block-selected.png` });

    // Name tag expanded into quick actions.
    await editable(page).locator(".ed-tag-name").hover();
    await expect(editable(page).getByRole("button", { name: "Duplicate" })).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/3-name-tag-expanded.png` });

    // Layers flyout pinned.
    await rail(page, "Layers").click();
    await flyout(page).getByRole("button", { name: "Pin flyout" }).click();
    await page.mouse.move(700, 450);
    await page.screenshot({ path: `${shots}/4-layers-pinned.png` });
    await flyout(page).getByRole("button", { name: "Unpin flyout" }).click();
    await rail(page, "Layers").click();

    // Mobile frame hidden.
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Frame options for Mobile" }).click();
    await page.getByRole("menuitem", { name: "Hide frame" }).click();
    await expect(page.locator(".bd-hidden-chip")).toContainText("Mobile hidden");
    await page.getByRole("button", { name: "Fit all frames" }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${shots}/5-mobile-hidden.png` });
    await page.locator(".bd-hidden-chip").getByRole("button", { name: "Show" }).click();
    await page.getByRole("button", { name: "Fit all frames" }).click();

    // Dot grid on.
    await page.getByRole("button", { name: "Dot grid" }).click();
    await expect(page.locator(".bd")).toHaveAttribute("data-grid", "true");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${shots}/6-dot-grid-on.png` });
  });

  test("clicking the active rail icon closes its flyout", async ({ page }) => {
    await rail(page, "Pages").click();
    await expect(flyout(page)).toHaveAttribute("data-panel", "pages");
    await expect(rail(page, "Pages")).toHaveAttribute("aria-pressed", "true");
    await rail(page, "Pages").click();
    await expect(flyout(page)).toHaveCount(0);
    await expect(rail(page, "Pages")).toHaveAttribute("aria-pressed", "false");
  });

  test("an unpinned flyout closes on a canvas click, a pinned one doesn't", async ({ page }) => {
    await rail(page, "Theme").click();
    await expect(flyout(page)).toBeVisible();
    const spot = await emptyCanvas(page);
    await page.mouse.click(spot.x, spot.y);
    await expect(flyout(page)).toHaveCount(0);

    await rail(page, "Theme").click();
    await flyout(page).getByRole("button", { name: "Pin flyout" }).click();
    await page.mouse.click(spot.x, spot.y);
    // A click inside a frame is a canvas click too.
    await editable(page).locator("[data-puck-component]").first().click({ position: { x: 20, y: 20 } });
    await expect(flyout(page)).toBeVisible();
    // Esc leaves a pinned flyout alone; its icon closes it.
    await page.keyboard.press("Escape");
    await expect(flyout(page)).toBeVisible();
    await rail(page, "Theme").click();
    await expect(flyout(page)).toHaveCount(0);
    // The pin is remembered.
    await page.reload();
    await rail(page, "Theme").click();
    await expect(flyout(page).getByRole("button", { name: "Unpin flyout" })).toBeVisible();
  });

  test("closing a flyout keeps the selection", async ({ page }) => {
    await selectLayer(page, "Journals");
    await rail(page, "Layers").click();
    await expect(flyout(page)).toHaveCount(0);
    await expect(page.locator(".ed-inspector-title strong")).toHaveText("Journals");
    await rail(page, "Media").click();
    await page.keyboard.press("Escape");
    await expect(flyout(page)).toHaveCount(0);
    await expect(page.locator(".ed-inspector-title strong")).toHaveText("Journals");
  });

  test("the inspector hides when nothing is selected", async ({ page }) => {
    await expect(page.locator(".ed-inspector")).toHaveCount(0);
    await selectLayer(page, "Skills");
    await page.keyboard.press("Escape"); // closes the flyout
    await expect(page.locator(".ed-inspector")).toBeVisible();
    await page.keyboard.press("Escape"); // clears the selection
    await expect(page.locator(".ed-inspector")).toHaveCount(0);

    await selectLayer(page, "Skills");
    const spot = await emptyCanvas(page);
    await page.mouse.click(spot.x, spot.y); // closes the flyout and clears the selection
    await expect(page.locator(".ed-inspector")).toHaveCount(0);

    // Page settings now live in the Pages flyout.
    await rail(page, "Pages").click();
    await flyout(page).getByRole("button", { name: "Page settings for Home" }).click();
    await expect(flyout(page).getByText("Name (also the nav label)")).toBeVisible();
    await flyout(page).getByRole("button", { name: "Back to pages" }).click();
    await expect(flyout(page).locator(".ed-pages")).toBeVisible();
  });

  test("Duplicate and Delete from the name tag work and undo", async ({ page }) => {
    const count = await layerRows(page).count();
    await selectLayer(page, "Playlists");
    await page.keyboard.press("Escape");
    const tag = editable(page).locator(".ed-tag");

    await tag.locator(".ed-tag-name").hover();
    await tag.getByRole("button", { name: "Duplicate" }).click();
    await rail(page, "Layers").click();
    await expect(layerNamed(page, "Playlists")).toHaveCount(2);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(layerNamed(page, "Playlists")).toHaveCount(1);

    await layerNamed(page, "Playlists").click();
    await expect(page.locator(".ed-inspector-title strong")).toHaveText("Playlists");
    await page.keyboard.press("Escape");
    await tag.locator(".ed-tag-name").hover();
    await tag.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator(".ed-inspector")).toHaveCount(0);
    await rail(page, "Layers").click();
    await expect(layerNamed(page, "Playlists")).toHaveCount(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(layerNamed(page, "Playlists")).toHaveCount(1);
    await expect(layerRows(page)).toHaveCount(count);
  });

  test("a dragged frame position survives a reload", async ({ page }) => {
    const frame = page.locator('.bd-frame[data-bp="mobile"]');
    const before = await frame.evaluate((el) => (el as HTMLElement).style.left);
    const label = (await page.getByRole("button", { name: "Edit the Mobile frame" }).boundingBox())!;
    await page.mouse.move(label.x + 20, label.y + label.height / 2);
    await page.mouse.down();
    await page.mouse.move(label.x + 80, label.y + 60, { steps: 6 });
    await page.mouse.move(label.x + 140, label.y + 120, { steps: 6 });
    await expect(page.locator(".ed-shell")).toHaveClass(/is-interacting/);
    await page.mouse.up();
    await expect(page.locator(".ed-shell")).not.toHaveClass(/is-interacting/);
    const after = await frame.evaluate((el) => ({ left: (el as HTMLElement).style.left, top: (el as HTMLElement).style.top }));
    expect(after.left).not.toBe(before);
    // Dragging didn't make Mobile the active frame (a press without movement does).
    await expect(page.locator(".ed-island-bps").getByRole("button", { name: "Desktop" })).toHaveAttribute("aria-pressed", "true");

    await page.waitForTimeout(400); // positions are saved after a short pause
    await page.reload();
    await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
    await expect.poll(() => frame.evaluate((el) => ({ left: (el as HTMLElement).style.left, top: (el as HTMLElement).style.top }))).toEqual(after);

    // Reset positions puts it back.
    await page.getByRole("button", { name: "Frame options for Mobile" }).click();
    await page.getByRole("menuitem", { name: "Reset positions" }).click();
    await expect.poll(() => frame.evaluate((el) => (el as HTMLElement).style.left)).toBe(before);
  });

  test("the dot-grid toggle survives a reload", async ({ page }) => {
    const board = page.locator(".bd");
    await expect(board).toHaveAttribute("data-grid", "false");
    await page.getByRole("button", { name: "Dot grid" }).click();
    await expect(board).toHaveAttribute("data-grid", "true");
    await expect(page.getByRole("button", { name: "Dot grid" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(board).toHaveAttribute("data-grid", "true");
    // The apostrophe key toggles it too.
    await page.locator(".bd").click({ position: { x: 1300, y: 700 } });
    await page.keyboard.press("'");
    await expect(board).toHaveAttribute("data-grid", "false");
  });

  test("at least one frame always stays visible", async ({ page }) => {
    await page.getByRole("button", { name: "Frame options for Mobile" }).click();
    await page.getByRole("menuitem", { name: "Hide frame" }).click();
    await expect(page.locator('.bd-frame[data-bp="mobile"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Frame options for Desktop" }).click();
    await expect(page.getByRole("menuitem", { name: "Hide frame" })).toBeDisabled();
  });
});

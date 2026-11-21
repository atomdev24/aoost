import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { draftSite, editorPassword, onBoard, resetDraft, signIn } from "./helpers";

/**
 * Resizable project pieces and sketchbook cover materials (EDITOR-PROJECTS-JOURNALS.md).
 * Resizing a piece in the Mobile frame changes mobile only and is one undo step.
 * Screenshots of the sketchbooks at 1440 and 390 go to docs/screenshots/projects-journals.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/projects-journals");
const editable = (page: Page) => page.frameLocator("#preview-frame");
const desktopFrame = (page: Page) => page.frameLocator('iframe.bd-live[data-bp="desktop"]');
const PIECE = ".table>.piece:nth-child(2)";

type Size = { base: { scale: number }; desktop?: { scale: number } } | undefined;
/** The file name of the second piece shown (PIECE), as the inspector lists it. */
async function pieceFile(request: Parameters<typeof draftSite>[0]): Promise<string> {
  const home = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "home");
  for (const s of home.sections) for (const n of s.children) if (n.type === "AoostProjects") return n.content.projects.filter((p: { hidden?: boolean }) => !p.hidden)[1].image.split("/").pop();
  return "";
}

async function pieceSize(request: Parameters<typeof draftSite>[0]): Promise<Size> {
  const home = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "home");
  for (const s of home.sections) for (const n of s.children) if (n.type === "AoostProjects") return n.content.projects.filter((p: { hidden?: boolean }) => !p.hidden)[1].size; // the second piece shown (PIECE)
  return undefined;
}

test.describe("resizable project pieces", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    // Never write to the live Supabase project.
    await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
    await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
    await page.goto("/admin/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/admin/");
    await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
    await page.keyboard.press("Escape");
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("dragging a corner in the Mobile frame resizes that piece on mobile only; undo puts it back", async ({ page, request }) => {
    expect(await pieceSize(request)).toBeUndefined();
    await page.getByRole("button", { name: "Edit the Mobile frame" }).click();
    await expect(page.getByRole("button", { name: "Edit the Mobile frame" })).toHaveAttribute("aria-pressed", "true");
    const piece = editable(page).locator(PIECE);
    await expect(piece.locator("img")).toHaveJSProperty("complete", true);
    const b = await onBoard(page, piece);
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);

    const box = page.getByTestId("piece-box");
    await expect(box).toBeVisible();
    await expect(page.locator(".ed-piece-tag")).toContainText("100% · Mobile");
    // The live content may already have its own phone-only changes; the drag adds one.
    const scope = page.locator(".ed-scope");
    const changesBefore = (await scope.count()) ? Number(/(\d+) change/.exec((await scope.first().textContent()) ?? "")?.[1] ?? 0) : 0;
    const before = (await box.boundingBox())!;
    const neighbour = (await editable(page).locator(".table>.piece:nth-child(3)").boundingBox())!;

    // Drag the bottom-right corner outwards: one gesture.
    const h = (await page.locator('[data-piece-handle="se"]').boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + 40, h.y + 50, { steps: 10 });
    await page.mouse.up();

    await expect.poll(async () => (await pieceSize(request))?.base.scale ?? 1).toBeGreaterThan(1.2);
    const size = (await pieceSize(request))!;
    // Desktop keeps the size it had.
    expect(size.desktop).toEqual({ scale: 1 });
    const after = (await box.boundingBox())!;
    expect(after.width / before.width).toBeCloseTo(after.height / before.height, 1);
    expect(after.width).toBeGreaterThan(before.width * 1.2);
    // Its neighbour stays where it was.
    const still = (await editable(page).locator(".table>.piece:nth-child(3)").boundingBox())!;
    expect(Math.abs(still.x - neighbour.x) + Math.abs(still.y - neighbour.y)).toBeLessThan(1);
    // The piece is scaled in the Mobile frame and not in the Desktop frame.
    await expect.poll(() => piece.evaluate((el) => getComputedStyle(el).scale)).not.toBe("none");
    await expect.poll(() => desktopFrame(page).locator(PIECE).evaluate((el) => getComputedStyle(el).scale)).toBe("none");

    // The inspector row shows the size, tinted on this size, and the scope bar counts it.
    await page.locator('[class*="ArrayFieldItem-summary"]:visible', { hasText: await pieceFile(request) }).first().click();
    const field = page.locator(".ed-sizefield.is-over:visible");
    await expect(field).toBeVisible();
    await expect(field.getByRole("textbox", { name: "Size" })).toHaveValue(String(Math.round(size.base.scale * 100)));
    await expect(page.locator(".ed-scope")).toContainText(`${changesBefore + 1} change`);

    // One undo step takes the whole drag back.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => pieceSize(request)).toBeUndefined();
    await expect.poll(() => piece.evaluate((el) => getComputedStyle(el).scale)).toBe("none");
  });
});

test.describe("sketchbook cover materials", () => {
  test.beforeAll(() => mkdirSync(shots, { recursive: true }));

  for (const width of [1440, 390]) {
    test(`kraft and leather covers on the homepage at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
      await page.goto("/");
      const shelf = page.locator("#jrShelf");
      await expect(shelf.locator(".jr")).toHaveCount(4);
      const covers = shelf.locator(".jr-cv");
      await expect(covers.nth(0)).not.toHaveClass(/cv-/);
      await expect(covers.nth(1)).toHaveClass(/cv-kraft/);
      await expect(covers.nth(2)).not.toHaveClass(/cv-/);
      await expect(covers.nth(3)).toHaveClass(/cv-leather/);
      // Band and sticker are still there.
      await expect(covers.nth(1).locator(".jr-band")).toHaveCount(1);
      await expect(covers.nth(3).locator("img.st")).toHaveCount(1);
      const section = page.locator(".journals");
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await section.screenshot({ path: resolve(shots, `sketchbooks-${width}.png`) });
      if (width === 1440) {
        // The leather catches the light on hover.
        await shelf.locator(".jr").nth(3).hover();
        await page.waitForTimeout(1100);
        await shelf.locator(".jr").nth(3).screenshot({ path: resolve(shots, "leather-hover-1440.png") });
      }
    });
  }
});

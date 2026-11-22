import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homeBlock } from "./content";
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

type Spot = { scale: number; x?: number | null; y?: number | null };
type Size = { base: Spot; desktop?: Partial<Spot> } | undefined;
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
    // The live content may already size this piece (21 Nov: every piece has a desktop size); the drag changes Mobile only.
    const sizeBefore = await pieceSize(request);
    await page.getByRole("button", { name: "Edit the Mobile frame" }).click();
    await expect(page.getByRole("button", { name: "Edit the Mobile frame" })).toHaveAttribute("aria-pressed", "true");
    const piece = editable(page).locator(PIECE);
    await expect(piece.locator("img")).toHaveJSProperty("complete", true);
    const b = await onBoard(page, piece);
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);

    const box = page.getByTestId("piece-box");
    await expect(box).toBeVisible();
    await expect(page.locator(".ed-piece-tag")).toContainText("100% · Mobile");
    // The live content may already have its own phone-only changes; the drag adds one (none if the piece already had a size).
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

    await expect.poll(async () => (await pieceSize(request))?.base.scale ?? 1).toBeGreaterThan((sizeBefore?.base.scale ?? 1) + 0.2);
    const size = (await pieceSize(request))!;
    // Desktop keeps the size it had.
    expect(size.desktop).toEqual(sizeBefore?.desktop ?? { scale: 1 });
    const after = (await box.boundingBox())!;
    expect(after.width / before.width).toBeCloseTo(after.height / before.height, 1);
    expect(after.width).toBeGreaterThan(before.width * 1.2);
    // Like the site, the table makes room: the grown piece and its neighbour don't sit on each other.
    await expect
      .poll(async () => {
        const [p, n] = [(await piece.boundingBox())!, (await editable(page).locator(".table>.piece:nth-child(3)").boundingBox())!];
        const ix = Math.max(0, Math.min(p.x + p.width, n.x + n.width) - Math.max(p.x, n.x)), iy = Math.max(0, Math.min(p.y + p.height, n.y + n.height) - Math.max(p.y, n.y));
        return (ix * iy) / Math.min(p.width * p.height, n.width * n.height);
      })
      .toBeLessThan(0.1);
    void neighbour;
    // The piece is scaled in the Mobile frame and not in the Desktop frame.
    await expect.poll(() => piece.evaluate((el) => getComputedStyle(el).scale)).not.toBe("none");
    // the desktop frame keeps the size it had (none, or the live content's own desktop size)
    const desktopScale = sizeBefore?.desktop && sizeBefore.desktop.scale !== 1 ? String(sizeBefore.desktop.scale) : "none";
    await expect.poll(() => desktopFrame(page).locator(PIECE).evaluate((el) => getComputedStyle(el).scale)).toBe(desktopScale);

    // The inspector row shows the size, tinted on this size, and the scope bar counts it.
    // picking the piece opened its own item in the inspector (no need to find it in the list)
    const field = page.locator(".ed-sizefield.is-over:visible");
    await expect(field).toBeVisible();
    await expect(field.getByRole("textbox", { name: "Size" })).toHaveValue(String(Math.round(size.base.scale * 100)));
    await expect(page.locator(".ed-scope")).toContainText(`${sizeBefore ? changesBefore : changesBefore + 1} change`);

    // One undo step takes the whole drag back.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => pieceSize(request)).toEqual(sizeBefore);
    await expect.poll(() => piece.evaluate((el) => getComputedStyle(el).scale)).toBe(sizeBefore?.base && sizeBefore.base.scale !== 1 ? String(sizeBefore.base.scale) : "none");
  });

  test("dragging a piece in the Desktop frame places it there on desktop only; the site follows; double-click lets the table place it again", async ({ page, request }) => {
    const piece = editable(page).locator(PIECE);
    await expect(piece.locator("img")).toHaveJSProperty("complete", true);
    const b0 = await onBoard(page, piece);
    await page.mouse.click(b0.x + b0.width / 2, b0.y + b0.height / 2);
    const box = page.getByTestId("piece-box");
    await expect(box).toBeVisible();
    const g = (await box.boundingBox())!;
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2 + 220, g.y + g.height / 2 + 30, { steps: 12 });
    await page.mouse.up();

    // saved for desktop, as fractions of the table; mobile stays automatic
    await expect.poll(async () => typeof (await pieceSize(request))?.desktop?.x).toBe("number");
    const size = (await pieceSize(request))!;
    expect(typeof size.base.x).not.toBe("number");
    await expect(page.locator(".ed-piece-tag")).toContainText("placed");
    // it followed the pointer on the board
    const b1 = await onBoard(page, piece);
    expect(b1.x + b1.width / 2 - (b0.x + b0.width / 2)).toBeGreaterThan(150);

    // the site puts it at the same spot on desktop, and not on a phone
    const site = await page.context().newPage();
    await site.setViewportSize({ width: 1440, height: 900 });
    await site.goto("/preview/");
    const table = site.locator("#table");
    await table.scrollIntoViewIfNeeded();
    await site.waitForTimeout(600);
    const at = await site.evaluate((sel) => {
      const t = document.querySelector("#table")!.getBoundingClientRect(), p = document.querySelector(sel)!.getBoundingClientRect();
      return { x: (p.left + p.width / 2 - t.left) / t.width, px: getComputedStyle(document.querySelector(sel)!).getPropertyValue("--px").trim() };
    }, PIECE);
    expect(Math.abs(at.x - size.desktop!.x!)).toBeLessThan(0.02);
    await site.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => site.evaluate((sel) => getComputedStyle(document.querySelector(sel)!).getPropertyValue("--px").trim(), PIECE)).not.toMatch(/^0?\.\d|^1$/);
    await site.close();

    // double-click: back to the automatic spot
    const g2 = (await box.boundingBox())!;
    await page.mouse.dblclick(g2.x + g2.width / 2, g2.y + g2.height / 2);
    await expect.poll(async () => typeof (await pieceSize(request))?.desktop?.x).not.toBe("number");
    await expect(page.locator(".ed-piece-tag")).not.toContainText("placed");
  });

  test("picking a piece opens its own settings; the clover can be picked, moved and resized", async ({ page, request }) => {
    const ins = page.locator(".ed-inspector");
    const expanded = () => ins.locator('[class*="ArrayFieldItem--isExpanded"] > [class*="ArrayFieldItem-summary"]').allTextContents();
    // a piece: its item opens in the Projects list
    const piece = editable(page).locator(PIECE);
    await expect(piece.locator("img")).toHaveJSProperty("complete", true);
    const b = await onBoard(page, piece);
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect.poll(expanded).toEqual([await pieceFile(request)]);

    // the clover (a fixture): picked over what's under it, its item opens, it moves and resizes
    const fixtures = async () => {
      const home = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "home");
      for (const s of home.sections) for (const n of s.children) if (n.type === "AoostProjects") return n.content.fixtures as { image: string; x: number; y: number; width: number; size?: { base: { scale: number; x?: number | null }; desktop?: { scale?: number; x?: number | null } } }[];
      return [];
    };
    const before = (await fixtures())[0]!;
    const clover = editable(page).locator('.fixture[data-fixture="0"]');
    const c = await onBoard(page, clover);
    await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
    await expect(page.locator(".ed-piece-tag")).toContainText("Desktop");
    await expect.poll(expanded).toEqual([before.image.split("/").pop()]);
    const box = page.getByTestId("piece-box");
    const g = (await box.boundingBox())!;
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2 + 120, g.y + g.height / 2 + 40, { steps: 10 });
    await page.mouse.up();
    // moved on Desktop: its own spot there (a fraction of the table); phones keep the shared spot
    await expect.poll(async () => (await fixtures())[0]!.size?.desktop?.x ?? -1).toBeGreaterThan(before.x / 100 + 0.03);
    expect((await fixtures())[0]!.size?.base.x ?? null).toBeNull();
    const h = (await page.locator('[data-piece-handle="se"]').boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + 30, h.y + 30, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await fixtures())[0]!.size?.desktop?.scale ?? 1).toBeGreaterThan(1);
  });
});

test.describe("sketchbook covers", () => {
  test.beforeAll(() => mkdirSync(shots, { recursive: true }));
  // Follows the published shelf: a mockup photo stands in for the drawn book; otherwise the material shows.
  const shown = (homeBlock("AoostJournals").journals as { hidden?: boolean; mockup?: string; material?: string; sticker?: string }[]).filter((j) => !j.hidden);

  for (const width of [1440, 390]) {
    test(`shelf covers on the homepage at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
      await page.goto("/");
      const shelf = page.locator("#jrShelf");
      await expect(shelf.locator(".jr")).toHaveCount(shown.length);
      const covers = shelf.locator(".jr-cv");
      for (const [k, j] of shown.entries()) {
        const cv = covers.nth(k);
        if (j.mockup) {
          await expect(cv).toHaveClass(/jr-mock/);
          await expect(cv.locator("img")).toHaveAttribute("src", j.mockup);
          await expect.poll(() => cv.locator("img").evaluate((m: HTMLImageElement) => m.complete && m.naturalWidth > 0)).toBe(true);
          continue;
        }
        const mat = j.material === "kraft" || j.material === "leather" ? j.material : "";
        if (mat) await expect(cv).toHaveClass(new RegExp(`cv-${mat}`));
        else await expect(cv).not.toHaveClass(/cv-/);
        await expect(cv.locator(".jr-band")).toHaveCount(1);
        if (j.sticker) await expect(cv.locator("img.st")).toHaveCount(1);
      }
      const section = page.locator(".journals");
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await section.screenshot({ path: resolve(shots, `sketchbooks-${width}.png`) });
    });
  }
});

import { expect, test, type Locator } from "@playwright/test";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * The homepage's projects table: the editor's Desktop frame lays the pieces out exactly as the
 * site does (same code, runtime/table.js), and pieces never end up on top of each other: a piece
 * put down on another one stays where it was put and the other moves out of the way.
 */
const password = editorPassword();

type Box = { l: number; t: number; r: number; b: number };
const boxes = (table: Locator) => table.locator(".piece").evaluateAll((els) => els.map((e) => ({ tf: (e as HTMLElement).style.transform, w: (e as HTMLElement).style.width })));
const rects = (table: Locator): Promise<Box[]> =>
  table.locator(".piece").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
/** Pairs whose (turned) boxes overlap by more than the corners a tilt can add. */
const stacked = (bs: Box[]) => bs.flatMap((a, i) => bs.slice(i + 1).flatMap((c, k) => (Math.min(a.r, c.r) - Math.max(a.l, c.l) > 20 && Math.min(a.b, c.b) - Math.max(a.t, c.t) > 20 ? [[i, i + 1 + k]] : [])));

test.describe("projects table", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");

  test("the editor's Desktop frame shows the pieces where the site puts them", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/admin/?page=home");
    const editorTable = page.frameLocator("#preview-frame").locator("#table");
    await expect(editorTable).not.toHaveClass(/ao-static/, { timeout: 15_000 });
    await expect.poll(async () => (await boxes(editorTable)).every((b) => b.tf.startsWith("translate"))).toBe(true);

    const site = await page.context().newPage();
    await site.setViewportSize({ width: 1440, height: 900 });
    await site.goto("/preview/");
    const siteTable = site.locator("#table");
    await expect.poll(async () => (await boxes(siteTable)).length).toBeGreaterThan(0);
    // Images load at their own pace on each side; once both have settled they match exactly.
    await expect.poll(async () => JSON.stringify(await boxes(editorTable)) === JSON.stringify(await boxes(siteTable)), { timeout: 10_000 }).toBe(true);
    // Pieces placed in the editor may overlap on purpose; the automatic layout never stacks them.
    const placed = await site.evaluate(() => [...document.querySelectorAll("#table>.piece")].some((e) => /^[\d.]+$/.test(getComputedStyle(e).getPropertyValue("--px").trim())));
    if (!placed) expect(stacked(await rects(siteTable))).toEqual([]);
  });

  test("a piece put down on another stays put, and the other moves clear", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/");
    const table = page.locator("#table");
    await table.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    let bs = await rects(table);
    expect(bs.length).toBeGreaterThan(3);
    // Pick up the third piece (the metal clover can sit over the first) and drop it on the fourth.
    const from = bs[2]!, to = bs[3]!;
    const target = { x: (to.l + to.r) / 2 + 10, y: (to.t + to.b) / 2 + 10 };
    await page.mouse.move((from.l + from.r) / 2, (from.t + from.b) / 2);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(1000);
    bs = await rects(table);
    expect(Math.abs((bs[2]!.l + bs[2]!.r) / 2 - target.x)).toBeLessThan(20);
    expect(Math.abs((bs[3]!.l + bs[3]!.r) / 2 - (to.l + to.r) / 2)).toBeGreaterThan(40);
    expect(stacked(bs)).toEqual([]);
  });
});

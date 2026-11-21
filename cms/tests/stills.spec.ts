import { expect, test } from "@playwright/test";
import { editorPassword, mcpCall, resetDraft, signIn } from "./helpers";

/**
 * Still pictures on the board (FrameStill / stills.ts): frames you aren't editing show a picture of
 * their page, every frame does while the board moves, and the one you edit is live once it stops.
 * A click on a picture still picks the block under it; an edit brings fresh pictures.
 */
const password = editorPassword();
const state = (page: import("@playwright/test").Page) =>
  page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>(".bd-frame")].map((f) => [f.dataset.bp + (f.classList.contains("bd-frame-active") ? "*" : ""), f.classList.contains("is-still") ? "still" : "live"])));

test.describe("still pictures on the board", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".bd-frame-active iframe");
  });

  test("other frames show a picture, the edited one is live; zooming turns them all to pictures, then back", async ({ page }) => {
    await expect.poll(() => state(page), { timeout: 20_000 }).toEqual({ "desktop*": "live", mobile: "still" });
    // The picture is the page: same size as its frame.
    const fits = await page.evaluate(() => {
      const f = document.querySelector<HTMLElement>('.bd-frame[data-bp="mobile"]')!;
      const c = f.querySelector<HTMLCanvasElement>(".bd-still canvas")!;
      return Math.abs(c.width - 390) <= 1;
    });
    expect(fits).toBe(true);
    const bd = (await page.locator(".bd").boundingBox())!;
    await page.mouse.move(bd.x + bd.width / 2, bd.y + bd.height / 2);
    await page.keyboard.down("Control");
    const during: Record<string, string>[] = [];
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, -10);
      if (i === 6) during.push(await state(page));
    }
    await page.keyboard.up("Control");
    expect(during[0]).toEqual({ "desktop*": "still", mobile: "still" });
    await expect.poll(() => state(page), { timeout: 3000 }).toEqual({ "desktop*": "live", mobile: "still" });
  });

  test("a click on a frame's picture picks the block under it, in that frame", async ({ page }) => {
    await expect.poll(() => state(page), { timeout: 20_000 }).toEqual({ "desktop*": "live", mobile: "still" });
    // Find a heading in the (hidden) mobile page and click its place on the picture.
    const at = await page.evaluate(() => {
      const f = document.querySelector<HTMLElement>('.bd-frame[data-bp="mobile"]')!;
      const doc = f.querySelector("iframe")!.contentDocument!;
      const h = doc.querySelector("h1, h2")!;
      const r = h.getBoundingClientRect();
      const fr = f.getBoundingClientRect();
      const zoom = fr.width / 390;
      return { x: fr.left + (r.left + r.width / 2) * zoom, y: fr.top + (r.top + Math.min(r.height / 2, 10)) * zoom };
    });
    await page.mouse.click(at.x, at.y);
    await expect(page.locator('.bd-frame-active[data-bp="mobile"]')).toHaveCount(1);
    await expect(page.locator(".ed-inspector-title strong")).not.toHaveText("");
  });

  test("an edit brings a fresh picture", async ({ page, request }) => {
    await expect.poll(() => state(page), { timeout: 20_000 }).toEqual({ "desktop*": "live", mobile: "still" });
    // Mark the current picture; a fresh one is a different canvas.
    await page.evaluate(() => ((document.querySelector('.bd-frame[data-bp="mobile"] .bd-still canvas') as HTMLCanvasElement & { old?: boolean }).old = true));
    const fresh = () => page.evaluate(() => !(document.querySelector('.bd-frame[data-bp="mobile"] .bd-still canvas') as (HTMLCanvasElement & { old?: boolean }) | null)?.old);
    await mcpCall(request, password!, "add_section", { page: "sample", kind: "grid", name: "Fresh", index: 0, layout: { columns: 1 }, nodes: [{ type: "Text", content: { text: "A brand new line" } }] });
    await expect.poll(fresh, { timeout: 15_000 }).toBe(true);
  });
});

import { expect, test, type Page } from "@playwright/test";
import { onBoard } from "./helpers";

/** The handle in the middle of a section's bottom edge changes its height on the size being edited. */
test.describe("section height handle", () => {
  test.beforeEach(async ({ request }) => {
    expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  });

  type S = { id: string; kind: string; layout: Record<string, Record<string, unknown> | undefined> };
  const sections = async (page: Page) => {
    const { site } = await (await page.request.get("/demo/api/editor/site")).json();
    return (site.pages as { isHome?: boolean; sections: S[] }[]).find((p) => p.isHome)!.sections;
  };

  async function drag(page: Page, id: string, dy: number) {
    const frame = page.locator("#preview-frame").contentFrame();
    const sec = frame.locator(`[data-section-id="${id}"]`);
    const handle = sec.locator(":scope > .ed-sh");
    const b = await onBoard(page, handle);
    const before = (await sec.boundingBox())!.height;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await expect(handle).toHaveCSS("opacity", "1");
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + dy / 2, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + dy, { steps: 4 });
    await expect(handle).toHaveAttribute("data-h", /px|content/);
    await page.mouse.up();
    return before;
  }

  test("drag a canvas section and a stacked section taller, then back", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/demo/?page=home");
    await page.getByRole("button", { name: "Got it" }).click();
    const frame = page.locator("#preview-frame").contentFrame();
    const all = await sections(page);
    const canvas = all.find((s) => s.kind === "canvas")!;
    const flow = all.find((s) => s.kind === "flow")!;

    const c0 = await drag(page, canvas.id, 80);
    await expect.poll(async () => (await sections(page)).find((s) => s.id === canvas.id)!.layout.desktop?.height).toBeGreaterThan(0);
    await expect.poll(async () => (await frame.locator(`[data-section-id="${canvas.id}"]`).boundingBox())!.height).toBeGreaterThan(c0 + 20);
    // mobile keeps its own height
    expect((await sections(page)).find((s) => s.id === canvas.id)!.layout.base?.height).toBe(canvas.layout.base?.height);

    const f0 = await drag(page, flow.id, 80);
    await expect.poll(async () => (await sections(page)).find((s) => s.id === flow.id)!.layout.desktop?.minHeight).toMatch(/^\d+px$/);
    await expect.poll(async () => (await frame.locator(`[data-section-id="${flow.id}"]`).boundingBox())!.height).toBeGreaterThan(f0 + 20);
    await page.screenshot({ path: "test-results/section-height.png" });

    // all the way back up: the section fits its content again
    await drag(page, flow.id, -400);
    await expect.poll(async () => (await sections(page)).find((s) => s.id === flow.id)!.layout.desktop?.minHeight).toBeUndefined();
  });
});

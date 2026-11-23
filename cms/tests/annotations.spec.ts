import { expect, test } from "@playwright/test";

/** Fruit readings: drag a mark on the picture, drop a new reading onto it, and they play in on the page. */
test.describe("fruit readings", () => {
  test.beforeEach(async ({ request }) => {
    expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  });

  test("move a mark, drop one on a picture, see them play on the page", async ({ page, request }) => {
    test.setTimeout(90_000);
    await page.goto("/demo/");
    await page.getByRole("button", { name: "Got it" }).click();
    await page.getByRole("button", { name: "Templates", exact: true }).click();
    await page.locator(".ed-tpl-card").nth(1).getByRole("button", { name: /^New page/ }).click();
    const frame = page.locator("#preview-frame").contentFrame();
    const mark = frame.locator(".ann-m").first();
    await expect(mark).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: "test-results/ann-editor.png" });

    // drag the first mark 60px right, 40px down (in screen pixels)
    const b = (await mark.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 30, b.y + b.height / 2 + 20, { steps: 5 });
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 40, { steps: 5 });
    await page.mouse.up();

    // drop a new reading onto the picture
    await frame.locator(".ann").first().evaluate((ann) => {
      const img = ann.parentElement!.querySelector("img")!;
      const r = img.getBoundingClientRect();
      const dt = new DataTransfer();
      dt.setData("application/x-aoost-annotation", "1");
      const at = { clientX: r.left + r.width * 0.3, clientY: r.top + r.height * 0.7, bubbles: true, cancelable: true, dataTransfer: dt };
      img.dispatchEvent(new DragEvent("dragover", at));
      img.dispatchEvent(new DragEvent("drop", at));
    });
    await expect(frame.locator(".ann-m")).toHaveCount(4);
    await page.waitForTimeout(2500); // saved

    const { site } = await (await request.get("/demo/api/editor/site")).json();
    const img = site.pages.flatMap((p: { sections: { children: { type: string; content: { marks?: { x: number; y: number }[] } }[] }[] }) => p.sections.flatMap((s) => s.children)).find((n: { type: string; content: { marks?: unknown[] } }) => n.type === "Image" && n.content.marks);
    expect(img.content.marks).toHaveLength(4);
    expect(img.content.marks[0].x).toBeGreaterThan(18.5);
    expect(img.content.marks[3].x).toBeCloseTo(30, 0);

    const pageSlug = site.pages.find((p: { sections: unknown[]; slug: string; title: string }) => p.title === "Brochures").slug;
    const view = await page.context().newPage();
    await view.setViewportSize({ width: 1440, height: 900 });
    await view.goto(`/demo/preview${pageSlug}/`);
    const set = view.locator("[data-ann]").first();
    await set.scrollIntoViewIfNeeded();
    await expect(set).toHaveClass(/\bin\b/);
    await view.waitForTimeout(3500);
    await expect(view.locator("[data-count]").first()).not.toHaveText("0");
    await set.screenshot({ path: "test-results/ann-page.png" });
  });

  test("readings on a zoomed picture still play", async ({ page, request }) => {
    const { site } = await (await request.get("/demo/api/editor/site")).json();
    const home = site.pages.find((p: { isHome?: boolean }) => p.isHome) ?? site.pages[0];
    type N = { type: string; content: Record<string, unknown>; frame?: Record<string, unknown> };
    const img = (home.sections as { children: N[] }[]).flatMap((s) => s.children).find((n) => n.type === "Image")!;
    img.content.marks = [{ x: 50, y: 50, r: 4, size: 68, colour: "break", side: "left" }];
    // zoomed in a long way, so the reading layer is several screens big
    img.frame = { base: { fit: "free", focalX: 50, focalY: 50, zoom: 3, panX: 0, panY: 0 } };
    const res = await request.post("/demo/api/editor/ops", { data: { ops: [{ op: "putPage", page: home }] } });
    expect(res.ok()).toBe(true);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/demo/preview${home.slug === "/" ? "" : home.slug}/`);
    const set = page.locator("[data-ann]").first();
    await set.scrollIntoViewIfNeeded();
    await expect(set).toHaveClass(/\bin\b/, { timeout: 5_000 });
  });
});

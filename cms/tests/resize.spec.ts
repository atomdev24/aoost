import { expect, test } from "@playwright/test";

/** Resizing on the canvas: a picture in a stacked section from its corner, a fruit reading's ring from its handle. */
test.describe("resize on the canvas", () => {
  test.beforeEach(async ({ request }) => {
    expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  });

  // To rewrite: it starts from a demo template that the Aerobotics templates replaced (ROADMAP: tests to rewrite).
  test.fixme("a picture keeps its proportions, a ring grows with its label", async ({ page, request }) => {
    test.setTimeout(90_000);
    await page.goto("/demo/");
    await page.getByRole("button", { name: "Templates", exact: true }).click();
    await page.locator(".ed-tpl-card").nth(1).getByRole("button", { name: /^New page/ }).click();
    const frame = page.locator("#preview-frame").contentFrame();
    await expect(frame.locator(".ann-m").first()).toBeVisible({ timeout: 20_000 });

    // select the hero picture, then drag its ring handle outwards
    const pic = frame.locator(".n:has(.ann)").first();
    await pic.click({ position: { x: 10, y: 10 } });
    const handle = frame.locator("[data-ann-h]").first();
    await expect(handle).toBeVisible();
    const hb = (await handle.boundingBox())!;
    const fb = (await page.locator("#preview-frame").boundingBox())!;
    console.log("hit", JSON.stringify(hb), await frame.locator("body").evaluate((b, p) => { const e = b.ownerDocument.elementFromPoint(p.x, p.y); return e ? e.outerHTML.slice(0, 100) : "none"; }, { x: (hb.x + hb.width / 2 - fb.x) / (fb.width / 1440), y: (hb.y + hb.height / 2 - fb.y) / (fb.width / 1440) }));
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 + 5, hb.y + hb.height / 2, { steps: 4 });
    await page.mouse.move(hb.x + hb.width / 2 + 10, hb.y + hb.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(frame.locator("[data-ed-ratio]").first()).toHaveAttribute("aria-pressed", "true");

    // the same picture sits in a grid section: shrink it from its corner handle, proportions kept
    const corner = frame.locator("[data-ed-flow-handle]").first();
    await expect(corner).toBeVisible();
    const cb = (await corner.boundingBox())!;
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
    await page.mouse.down();
    await page.mouse.move(cb.x - 20, cb.y, { steps: 4 });
    await page.mouse.move(cb.x - 40, cb.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(2500);
    const { site } = await (await request.get("/demo/api/editor/site")).json();
    const brochures = site.pages.find((p: { title: string }) => p.title === "Brochures");
    const img = brochures.sections.flatMap((s: { children: unknown[] }) => s.children).find((n: { type: string; content: { marks?: unknown[] } }) => n.type === "Image" && n.content.marks);
    expect(img.content.marks[0].r).toBeGreaterThan(8.5);
    expect(img.style.desktop.width).toMatch(/%$/);
    expect(parseFloat(img.style.desktop.width)).toBeLessThan(100);
    expect(img.style.desktop.aspectRatio ?? img.style.base.aspectRatio).toBe("4/5");
    await page.screenshot({ path: "test-results/resize-ring.png" });
  });
});

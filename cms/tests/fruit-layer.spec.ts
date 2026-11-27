import { expect, test } from "@playwright/test";

/**
 * A fruit reading as its own layer over a locked picture with parallax: drop it on,
 * it anchors to the spot under it; move it, the anchor follows; on the page it stays
 * on that spot while the picture slides.
 */
test("fruit reading layer anchors to the picture and follows it", async ({ page, request }) => {
  test.setTimeout(120_000);
  expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  const { site } = await (await request.get("/demo/api/editor/site")).json();
  const home = site.pages.find((p: { id: string }) => p.id === "home");
  home.sections.unshift({
    id: "s-hero",
    kind: "canvas",
    layout: { base: { columns: 1, gap: 0, padding: "0px", height: 700 }, desktop: { columns: 1, gap: 0, padding: "0px", height: 700 } },
    children: [
      {
        id: "n-photo",
        type: "Image",
        locked: true,
        content: { src: "/art/tpl_aero_hero_wide.webp", alt: "", lightbox: false, width: 2400, height: 1299 },
        effects: { parallax: 0.3 },
        style: { base: { x: 0, y: 0, w: 390, h: 700, z: 0 }, desktop: { x: -76.52, y: -27.21, w: 1594.85, h: 740.69, rotation: 0, z: 0 } },
        frame: { base: { fit: "fill", focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 }, desktop: { fit: "free", focalX: 30, focalY: 53, zoom: 1.25, panX: -2.62, panY: -1.04 } },
      },
    ],
  });
  expect((await request.post("/demo/api/editor/ops", { data: { ops: [{ op: "putPage", page: home }] } })).ok()).toBe(true);

  await page.goto("/demo/");
  const frame = page.locator("#preview-frame").contentFrame();
  const photo = frame.locator(".n-n-photo");
  await expect(photo).toBeVisible({ timeout: 20_000 });

  // the locked picture ignores clicks
  expect(await photo.evaluate((n) => getComputedStyle(n).pointerEvents)).toBe("none");

  // drop a reading at 60% / 45% of the photo's on-screen box
  await photo.evaluate((n) => {
    const r = n.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData("application/x-aoost-annotation", "1");
    const at = { clientX: r.left + r.width * 0.6, clientY: r.top + r.height * 0.45, bubbles: true, cancelable: true, dataTransfer: dt };
    const target = n.ownerDocument.elementFromPoint(at.clientX, at.clientY)!;
    target.dispatchEvent(new DragEvent("dragover", at));
    target.dispatchEvent(new DragEvent("drop", at));
  });
  const reading = frame.locator('.n[data-type="FruitReading"]');
  await expect(reading).toHaveCount(1);
  await page.waitForTimeout(2500);
  let s2 = (await (await request.get("/demo/api/editor/site")).json()).site;
  let node = s2.pages.find((p: { id: string }) => p.id === "home").sections[0].children.find((n: { type: string }) => n.type === "FruitReading");
  expect(node.content.anchor.id).toBe("n-photo");
  const first = node.content.anchor;

  // drag it 40px right on screen: the anchor moves to the new spot
  const b = (await reading.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 20, b.y + b.height / 2, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(2500);
  s2 = (await (await request.get("/demo/api/editor/site")).json()).site;
  node = s2.pages.find((p: { id: string }) => p.id === "home").sections[0].children.find((n: { type: string }) => n.type === "FruitReading");
  expect(node.content.anchor.x).toBeGreaterThan(first.x + 1);
  await page.screenshot({ path: "test-results/fruit-layer-editor.png" });

  // on the page: the reading's centre stays on the same spot of the picture while scrolling
  const view = await page.context().newPage();
  await view.setViewportSize({ width: 1440, height: 900 });
  await view.goto("/demo/preview/");
  await view.waitForTimeout(1500);
  const spot = async () =>
    view.evaluate(() => {
      const fr = document.querySelector<HTMLElement>("[data-fr]")!;
      const n = fr.closest(".n")!.getBoundingClientRect();
      const probe = [...document.querySelectorAll<HTMLElement>(".n-n-photo .drift > div")].pop()!.getBoundingClientRect();
      return { x: ((n.left + n.width / 2 - probe.left) / probe.width) * 100, y: ((n.top + n.height / 2 - probe.top) / probe.height) * 100, ax: Number(fr.dataset.ax), ay: Number(fr.dataset.ay) };
    });
  const a = await spot();
  expect(Math.abs(a.x - a.ax)).toBeLessThan(0.6);
  expect(Math.abs(a.y - a.ay)).toBeLessThan(0.6);
  await view.screenshot({ path: "test-results/fruit-layer-page0.png" });
  await view.mouse.wheel(0, 260);
  await view.waitForTimeout(900);
  const c = await spot();
  expect(Math.abs(c.x - c.ax)).toBeLessThan(0.6);
  expect(Math.abs(c.y - c.ay)).toBeLessThan(0.6);
  await view.screenshot({ path: "test-results/fruit-layer-page1.png" });
});

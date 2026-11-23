import { expect, test } from "@playwright/test";

/** A free-layout layer placed on desktop only: phones show the same composition, scaled down. */
test("desktop-first layers adapt to phones", async ({ page, request }) => {
  expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  const { site } = await (await request.get("/demo/api/editor/site")).json();
  const home = site.pages.find((p: { id: string }) => p.id === "home");
  home.sections.unshift({
    id: "s-free",
    kind: "canvas",
    layout: { base: { columns: 1, gap: 0, padding: "0px", height: 480 }, desktop: { columns: 1, gap: 0, padding: "0px", height: 720 } },
    children: [{ id: "n-box", type: "Shape", content: { kind: "rectangle", fill: "#0075E1", stroke: "", strokeWidth: 0, corners: 0 }, style: { base: {}, desktop: { x: 720, y: 360, w: 360, h: 180, z: 1 } } }],
  });
  expect((await request.post("/demo/api/editor/ops", { data: { ops: [{ op: "putPage", page: home }] } })).ok()).toBe(true);
  for (const [w, expectX] of [
    [1440, 720],
    [390, 195],
  ] as const) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/demo/preview/");
    const b = (await page.locator(".n-n-box").boundingBox())!;
    expect(Math.abs(b.x - expectX)).toBeLessThan(3);
    expect(b.width / w).toBeCloseTo(360 / 1440, 2);
  }
});

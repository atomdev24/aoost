import { expect, test } from "@playwright/test";

/** A picture reaching past the frame's edge: handles outside the frame resize it; W shows what's outside. */
test("resize a layer from outside the frame, and W shows what hangs off", async ({ page, request }) => {
  test.setTimeout(90_000);
  expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  const { site } = await (await request.get("/demo/api/editor/site")).json();
  const home = site.pages.find((p: { id: string }) => p.id === "home");
  home.sections.unshift({
    id: "s-hero",
    kind: "canvas",
    layout: { base: { columns: 1, gap: 0, padding: "0px", height: 700 }, desktop: { columns: 1, gap: 0, padding: "0px", height: 700 } },
    children: [{ id: "n-photo", type: "Image", content: { src: "/art/tpl_aero_hero_wide.webp", alt: "", lightbox: false, width: 2400, height: 1299 }, style: { base: { x: 0, y: 0, w: 390, h: 700, z: 0 }, desktop: { x: -120, y: 0, w: 1700, h: 700, z: 0 } } }],
  });
  expect((await request.post("/demo/api/editor/ops", { data: { ops: [{ op: "putPage", page: home }] } })).ok()).toBe(true);
  await page.goto("/demo/");
  const frame = page.locator("#preview-frame").contentFrame();
  const pb = (await frame.locator(".n-n-photo").boundingBox({ timeout: 20_000 }))!;
  await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 3);
  const west = page.locator('.bd-over-h[data-h="w"]');
  await expect(west).toBeVisible();
  const b = (await west.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 10, b.y + b.height / 2, { steps: 4 });
  await page.mouse.move(b.x + 20, b.y + b.height / 2, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.press("w");
  await expect(page.locator(".bd-over-ghost")).toHaveCount(1);
  await page.screenshot({ path: "test-results/overflow.png" });
  await page.waitForTimeout(2500);
  const s2 = (await (await request.get("/demo/api/editor/site")).json()).site;
  const photo = s2.pages.find((p: { id: string }) => p.id === "home").sections[0].children[0];
  expect(photo.style.desktop.x).toBeGreaterThan(-120);
  expect(photo.style.desktop.w).toBeLessThan(1700);
});

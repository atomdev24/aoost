import { expect, test } from "@playwright/test";
import { onBoard } from "./helpers";

/** Darken and Blur on a picture: set them in the inspector, see the layer on the page, readings on top. */
test.describe("darken and blur a picture", () => {
  test.beforeEach(async ({ request }) => {
    expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  });

  test("set Darken and Blur on the first picture", async ({ page, request }) => {
    test.setTimeout(90_000);
    type N = { id: string; type: string; style: Record<string, Record<string, unknown> | undefined> };
    type P = { isHome?: boolean; slug: string; sections: { children: N[] }[] };
    const home = async () => {
      const { site } = await (await request.get("/demo/api/editor/site")).json();
      return (site.pages as P[]).find((p) => p.isHome)!;
    };
    const img = (p: P) => p.sections.flatMap((s) => s.children).find((n) => n.type === "Image")!;
    const id = img(await home()).id;

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/demo/?page=home");
    await page.getByRole("button", { name: "Got it" }).click();
    const frame = page.locator("#preview-frame").contentFrame();
    const box = await onBoard(page, frame.locator(`.n-${id}`));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const darken = page.locator(".ed-inspector").getByLabel("Darken", { exact: true });
    await darken.fill("50");
    await darken.press("Enter");
    const blur = page.locator(".ed-inspector").getByLabel("Blur", { exact: true });
    await blur.fill("8");
    await blur.press("Enter");
    await expect.poll(async () => img(await home()).style.desktop).toMatchObject({ shade: 50, blur: 8 });
    await expect(frame.locator(`.n-${id} .shade`)).toHaveCount(1);
    await page.screenshot({ path: "test-results/shade-editor.png" });

    const p = await home();
    const view = await page.context().newPage();
    await view.setViewportSize({ width: 1440, height: 900 });
    await view.goto(`/demo/preview${p.slug === "/" ? "" : p.slug}/`);
    const shade = view.locator(`.n-${id} .shade`);
    await shade.scrollIntoViewIfNeeded();
    expect(await shade.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).backdropFilter])).toEqual(["rgba(0, 0, 0, 0.5)", "blur(8px)"]);
    // on phones it stays clear: both were set on desktop only
    await view.setViewportSize({ width: 390, height: 844 });
    expect(await shade.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    await view.setViewportSize({ width: 1440, height: 900 });
    await view.locator(`.n-${id}`).screenshot({ path: "test-results/shade-page.png" });
  });
});

import { expect, test, type Page } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { draftSite, editorPassword, mcpCall, resetDraft, signIn } from "./helpers";

const __dirname = dirname(fileURLToPath(import.meta.url));

const password = editorPassword();
const shots = resolve(__dirname, "../../docs/screenshots");
const canvas = (page: Page) => page.frameLocator("#preview-frame");
const headline = async (request: Parameters<typeof draftSite>[0]) => (await draftSite(request, password!)).pages[0].sections[0].children[1];

test.describe("editor", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/");
    await expect(canvas(page).locator(".n-home-title")).toBeVisible();
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("is behind the password", async ({ browser }) => {
    const anon = await browser.newPage();
    await anon.goto("/admin/");
    await expect(anon).toHaveURL(/\/admin\/login$/);
    expect((await anon.request.get("/api/editor/site")).status()).toBe(401);
    expect((await anon.request.post("/mcp", { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } })).status()).toBe(401);
    await anon.close();
  });

  test("edits text, autosaves the draft, and undoes", async ({ page, request }) => {
    const box = (await canvas(page).locator(".n-home-title").boundingBox())!;
    await page.mouse.click(box.x + 20, box.y + 20);
    await page.locator("textarea:visible").first().fill("Edited in the test.");
    await expect(canvas(page).locator(".n-home-title")).toHaveText("Edited in the test.");
    await expect.poll(async () => (await headline(request)).content.text).toBe("Edited in the test.");
    await expect(page.locator(".ed-status")).toHaveText("Unpublished changes");
    await page.screenshot({ path: `${shots}/editor-1440.png` });
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(canvas(page).locator(".n-home-title")).toHaveText("A visual diary, for people in the know.");
    await expect.poll(async () => (await headline(request)).content.text).toBe("A visual diary, for people in the know.");
  });

  test("desktop edits store overrides only; the dot resets to mobile", async ({ page, request }) => {
    const box = (await canvas(page).locator(".n-home-title").boundingBox())!;
    await page.mouse.click(box.x + 20, box.y + 20);
    await expect(page.locator(".ed-bp-note:visible").first()).toContainText("Desktop overrides");
    const width = page.locator(".ed-row", { hasText: /^Width/ }).locator("input:visible").first();
    await width.fill("50%");
    await width.press("Enter");
    await expect.poll(async () => (await headline(request)).style).toEqual({ base: {}, desktop: { width: "50%" } });
    await page.locator(".ed-dot:visible").first().click();
    await expect.poll(async () => (await headline(request)).style).toEqual({ base: {} });
  });

  test("the Mobile switch narrows the preview to 390px and edits the base", async ({ page }) => {
    await page.getByRole("button", { name: "Mobile" }).click();
    await expect.poll(() => canvas(page).locator("html").evaluate((el) => el.ownerDocument.defaultView!.innerWidth)).toBe(390);
    const box = (await canvas(page).locator(".n-home-title").boundingBox())!;
    await page.mouse.click(box.x + 20, box.y + 20);
    await expect(page.locator(".ed-bp-note:visible").first()).toContainText("Mobile (base)");
  });

  test("drags a canvas layer with snapping; the move is stored per breakpoint", async ({ page, request }) => {
    await page.getByRole("button", { name: "Mobile" }).click();
    await page.waitForTimeout(800);
    const layer = canvas(page).locator(".n-home-photo");
    await layer.scrollIntoViewIfNeeded();
    const b = (await layer.boundingBox())!;
    const [sx, sy] = [b.x + b.width / 2, b.y + b.height / 2];
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(sx - 4 * i, sy - 6 * i);
    await page.mouse.up();
    await expect
      .poll(async () => {
        const style = (await draftSite(request, password!)).pages[0].sections[1].children[1].style;
        return [style.base.x, style.base.y, style.desktop.x];
      })
      .toEqual([110, 190, 760]); // moved on mobile only; desktop untouched
    await expect(canvas(page).locator(".n-home-photo.ed-selected")).toBeVisible();
  });

  test("an edit made through /mcp appears live, highlighted, and can be undone", async ({ page, request }) => {
    await expect(page.locator(".ed-live.is-on")).toBeVisible();
    const box = (await canvas(page).locator(".n-home-photo").boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect
      .poll(async () => JSON.parse((await mcpCall(request, password!, "get_editor_context")).content[0]!.text!).selected?.[0]?.id)
      .toBe("home-photo");

    const result = await mcpCall(request, password!, "update_node", { node_id: "home-photo", style: { radius: [48, 48, 48, 48] } });
    expect(result.isError).toBeFalsy();
    await expect(canvas(page).locator(".n-home-photo")).toHaveCSS("border-top-left-radius", "48px", { timeout: 2000 });
    await expect(canvas(page).locator(".n-home-photo.ed-flash")).toBeVisible();
    await expect(page.locator(".ed-status")).toHaveText("Claude: Update Image on Home");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(canvas(page).locator(".n-home-photo")).toHaveCSS("border-top-left-radius", "18px");
  });

  test("the connector returns a screenshot of the draft from the open editor", async ({ request }) => {
    const shot = await mcpCall(request, password!, "get_preview_screenshot", { page: "about", breakpoint: "mobile" });
    const image = shot.content.find((c) => c.type === "image");
    expect(image?.mimeType).toBe("image/png");
    expect(image!.data!.length).toBeGreaterThan(5000);
  });

  test("creates a page and re-URLs it with a redirect", async ({ page, request }) => {
    await page.getByRole("button", { name: "New page" }).click();
    await page.locator(".ed-modal input").first().fill("Sketchbook");
    await page.locator(".ed-templates button", { hasText: "Gallery" }).click();
    await page.getByRole("button", { name: "Create page" }).click();
    await expect(page.locator(".ed-page-row.is-selected")).toContainText("Sketchbook");
    const slug = page.locator("#ps-slug:visible");
    await slug.fill("sketches");
    await slug.press("Enter");
    await expect(page.locator(".ed-side:visible .ed-note").first()).toContainText("/sketchbook will redirect here");
    await expect
      .poll(async () => {
        const site = await draftSite(request, password!);
        return [site.pages.find((p: { title: string }) => p.title === "Sketchbook")?.slug, site.redirects];
      })
      .toEqual(["/sketches", [{ from: "/sketchbook", to: "/sketches" }]]);
  });
});

test.describe("quick edit on a phone", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 390, height: 844 } });

  test("edits text and adds a diary entry", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/");
    await expect(page.locator(".qe-brand span")).toHaveText("Quick edit");
    await page.locator(".qe-card textarea").nth(1).fill("Edited on a phone.");
    await page.getByRole("tab", { name: "Diary" }).click();
    await page.getByRole("button", { name: "+ New diary entry" }).click();
    await page.getByLabel("Title").fill("Phone entry");
    await page.getByLabel("Entry text").fill("Written from the couch.");
    await expect
      .poll(async () => {
        const site = await draftSite(request, password!);
        return [site.pages[0].sections[0].children[1].content.text, site.collections.diary[0].title];
      })
      .toEqual(["Edited on a phone.", "Phone entry"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: `${shots}/quick-edit-390.png` });
    await resetDraft(request, password!);
  });
});

import { expect, test, type Page } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { draftSite, editorPassword, mcpCall, onBoard, resetDraft, signIn } from "./helpers";

const __dirname = dirname(fileURLToPath(import.meta.url));

const password = editorPassword();
const shots = resolve(__dirname, "../../docs/screenshots");
const canvas = (page: Page) => page.frameLocator("#preview-frame");
// The breakpoint buttons in the centre island (the inspector's switch only shows while something is selected).
const bpSwitch = (page: Page, name: "Desktop" | "Mobile") => page.locator(".ed-island-bps").getByRole("button", { name });
// The editor tests work on the sample page: it has plain text and a free canvas. (The home page is made of the aoost blocks; see home-editor.spec.ts.)
const samplePage = async (request: Parameters<typeof draftSite>[0]) => (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "sample");
const headline = async (request: Parameters<typeof draftSite>[0]) => (await samplePage(request)).sections[0].children[1];

test.describe("editor", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await expect(canvas(page).locator(".n-sample-title")).toBeVisible();
    await page.keyboard.press("Escape"); // close the remembered (unpinned) flyout so the frame is clear
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
    const box = await onBoard(page, canvas(page).locator(".n-sample-title"));
    await page.mouse.click(box.x + 20, box.y + 20);
    await page.locator("textarea:visible").first().fill("Edited in the test.");
    await expect(canvas(page).locator(".n-sample-title")).toHaveText("Edited in the test.");
    await expect.poll(async () => (await headline(request)).content.text).toBe("Edited in the test.");
    await expect(page.locator(".ed-savedot")).toHaveAttribute("data-state", "saved");
    await expect(page.locator(".ed-savedot")).toHaveAttribute("title", /Last saved just now/);
    await page.screenshot({ path: `${shots}/editor-1440.png` });
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(canvas(page).locator(".n-sample-title")).toHaveText("Dust and neon.");
    await expect.poll(async () => (await headline(request)).content.text).toBe("Dust and neon.");
  });

  test("desktop edits are overrides; on Mobile the tinted label resets to desktop", async ({ page, request }) => {
    const box = await onBoard(page, canvas(page).locator(".n-sample-title"));
    await page.mouse.click(box.x + 20, box.y + 20);
    await expect(bpSwitch(page, "Desktop")).toHaveAttribute("aria-pressed", "true");
    const width = page.locator(".ed-inspector").getByLabel("Width", { exact: true });
    await width.fill("50%");
    await width.press("Enter");
    await expect.poll(async () => (await headline(request)).style).toEqual({ base: {}, desktop: { width: "50%" } });
    await bpSwitch(page, "Mobile").click();
    await expect(page.locator(".ed-scope")).toContainText("Editing Mobile · 1 change");
    await page.locator(".ed-label.is-over", { hasText: "Size" }).click();
    await page.getByRole("menuitem", { name: "Reset to desktop" }).click();
    await expect.poll(async () => (await headline(request)).style).toEqual({ base: { width: "50%" } });
  });

  test("the Mobile switch makes the 390px frame the editable one", async ({ page }) => {
    await bpSwitch(page, "Mobile").click();
    await expect.poll(() => canvas(page).locator("html").evaluate((el) => el.ownerDocument.defaultView!.innerWidth)).toBe(390);
    const box = await onBoard(page, canvas(page).locator(".n-sample-title"));
    await page.mouse.click(box.x + 20, box.y + 20);
    await expect(page.locator(".ed-scope")).toContainText("Editing Mobile");
  });

  test("drags a canvas layer with snapping; the move is stored per breakpoint", async ({ page, request }) => {
    await bpSwitch(page, "Mobile").click();
    await page.keyboard.press("ControlOrMeta+0"); // 100%: one screen pixel is one design pixel
    await page.waitForTimeout(800);
    const layer = canvas(page).locator(".n-sample-photo");
    const b = await onBoard(page, layer);
    const [sx, sy] = [b.x + b.width / 2, b.y + b.height / 2];
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(sx - 4 * i, sy + 6 * i);
    await page.mouse.up();
    await expect
      .poll(async () => {
        const style = (await samplePage(request)).sections[2].children[1].style;
        return [style.base.x, style.base.y, style.desktop.x];
      })
      .toEqual([130, 80, 820]); // moved on mobile only; desktop untouched
    await expect(canvas(page).locator(".n-sample-photo.ed-selected")).toBeVisible();
  });

  test("an edit made through /mcp appears live, highlighted, and can be undone", async ({ page, request }) => {
    await expect(page.locator(".ed-live.is-on")).toBeVisible();
    const box = await onBoard(page, canvas(page).locator(".n-sample-photo"));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect
      .poll(async () => JSON.parse((await mcpCall(request, password!, "get_editor_context")).content[0]!.text!).selected?.[0]?.id)
      .toBe("sample-photo");

    const result = await mcpCall(request, password!, "update_node", { node_id: "sample-photo", style: { radius: [48, 48, 48, 48] } });
    expect(result.isError).toBeFalsy();
    await expect(canvas(page).locator(".n-sample-photo")).toHaveCSS("border-top-left-radius", "48px", { timeout: 2000 });
    await expect(canvas(page).locator(".n-sample-photo.ed-flash")).toBeVisible();
    await expect(page.locator(".ed-status")).toHaveText("Claude: Update Image on Sample");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(canvas(page).locator(".n-sample-photo")).toHaveCSS("border-top-left-radius", "18px");
  });

  test("the connector returns a screenshot of the draft from the open editor", async ({ request }) => {
    const shot = await mcpCall(request, password!, "get_preview_screenshot", { page: "about", breakpoint: "mobile" });
    const image = shot.content.find((c) => c.type === "image");
    expect(image?.mimeType).toBe("image/png");
    expect(image!.data!.length).toBeGreaterThan(5000);
  });

  test("creates a page and re-URLs it with a redirect", async ({ page, request }) => {
    await page.locator(".ed-rail").getByRole("button", { name: "Pages", exact: true }).click();
    await page.getByRole("button", { name: "New page" }).click();
    await page.locator(".ed-modal input").first().fill("Sketchbook");
    await page.locator(".ed-templates button", { hasText: "Gallery" }).click();
    await page.getByRole("button", { name: "Create page" }).click();
    await expect(page.locator(".ed-page-row.is-selected")).toContainText("Sketchbook");
    await page.getByRole("button", { name: "Page settings for Sketchbook" }).click();
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
    await page.goto("/admin/?page=about");
    await expect(page.locator(".qe-brand span")).toHaveText("Quick edit");
    await page.locator(".qe-card textarea").nth(1).fill("Edited on a phone.");
    await page.getByRole("tab", { name: "Diary" }).click();
    await page.getByRole("button", { name: "+ New diary entry" }).click();
    await page.getByLabel("Title").fill("Phone entry");
    await page.getByLabel("Entry text").fill("Written from the couch.");
    await expect
      .poll(async () => {
        const site = await draftSite(request, password!);
        return [site.pages.find((p: { id: string }) => p.id === "about").sections[0].children[1].content.text, site.collections.diary[0].title];
      })
      .toEqual(["Edited on a phone.", "Phone entry"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: `${shots}/quick-edit-390.png` });
    await resetDraft(request, password!);
  });
});

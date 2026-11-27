import { expect, test, type Page } from "@playwright/test";
import { draftSite, editorPassword, onBoard, resetDraft, signIn } from "./helpers";

/** Right-click menu on the page, copy/paste of blocks, copy/paste of style, with the keys shown. */
const password = editorPassword();
const editable = (page: Page) => page.frameLocator("#preview-frame");
const sample = async (request: Parameters<typeof draftSite>[0]) => (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "sample");

test.describe("right-click menu", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/admin/?page=sample");
    await expect(editable(page).locator(".n-sample-title")).toBeVisible();
    await page.keyboard.press("Escape");
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("copy a block, paste it after another, from the menu", async ({ page, request }) => {
    const title = await onBoard(page, editable(page).locator(".n-sample-title"));
    await page.mouse.click(title.x + 30, title.y + 20, { button: "right" });
    const menu = page.getByRole("menu", { name: "Block" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Copy\s*⌘C|Copy\s*CtrlC/ })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("menu.png") });
    await menu.getByRole("menuitem", { name: /^Copy/ }).first().click();
    await expect(menu).toBeHidden();
    const lede = await onBoard(page, editable(page).locator(".n-sample-lede"));
    await page.mouse.click(lede.x + 20, lede.y + 8, { button: "right" });
    await page.getByRole("menu", { name: "Block" }).getByRole("menuitem", { name: /Paste after/ }).click();
    await expect(editable(page).locator(".n-sample-title")).toHaveCount(1);
    await expect.poll(async () => JSON.stringify((await sample(request)).sections[0].children.map((n: { content: { text?: string } }) => n.content.text))).toMatch(/Dust and neon\..*A flow section.*Dust and neon\./);
  });

  test("keys: ⌘C ⌘V copy and paste a block", async ({ page, request }) => {
    const title = await onBoard(page, editable(page).locator(".n-sample-title"));
    await page.mouse.click(title.x + 30, title.y + 20);
    await page.keyboard.press("ControlOrMeta+c");
    await page.keyboard.press("ControlOrMeta+v");
    await expect.poll(async () => (await sample(request)).sections[0].children.filter((n: { content: { text?: string } }) => n.content.text === "Dust and neon.").length).toBe(2);
  });

  test("keys: ⌥⌘C ⌥⌘V copy one block's look onto another", async ({ page, request }) => {
    const title = await onBoard(page, editable(page).locator(".n-sample-title"));
    await page.mouse.click(title.x + 30, title.y + 20);
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+Alt+KeyC");
    const lede = await onBoard(page, editable(page).locator(".n-sample-lede"));
    await page.mouse.click(lede.x + 20, lede.y + 8);
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+Alt+KeyV");
    await expect.poll(async () => (await sample(request)).sections[0].children.find((n: { id: string }) => n.id === "sample-lede")?.content.styleId, { timeout: 15000 }).toBe("hero");
  });

  test("a section's menu, and Align for a free-layout layer", async ({ page }) => {
    const canvasPic = await onBoard(page, editable(page).locator('.s[data-kind="canvas"] [data-node-id]').first());
    await page.mouse.click(canvasPic.x + 10, canvasPic.y + 10, { button: "right" });
    const menu = page.getByRole("menu", { name: "Block" });
    await menu.getByRole("menuitem", { name: /Align/ }).hover();
    const sub = page.getByRole("menu", { name: /Align/ });
    await expect(sub).toBeVisible();
    await expect(sub.getByRole("menuitem", { name: "Centre" })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("align.png") });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});

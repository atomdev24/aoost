import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * Uploading shows progress and can be cancelled: a tray with a progress bar, how much is sent
 * and a Cancel button; it then says "Uploaded" or "Upload cancelled". The media library has a
 * drop box, and dragging files over it says "Drop to upload".
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/uploads");
const editable = (page: Page) => page.frameLocator("#preview-frame");
const rail = (page: Page, name: string) => page.locator(".ed-rail").getByRole("button", { name, exact: true });
const flyout = (page: Page) => page.locator(".ed-flyout");
const tray = (page: Page) => page.locator(".ed-uploads");
let reloads = () => 0;

/** A 3 MB file of the given type, made in the page. */
const bigFile = (page: Page, name: string, type: string) =>
  page.evaluateHandle(([n, t]) => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(3 * 1024 * 1024)], n!, { type: t })); return dt; }, [name, type]);

test.describe("uploads: progress, cancel, drop box", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(60_000);
  test.beforeAll(() => mkdirSync(shots, { recursive: true }));
  test.beforeEach(async ({ page, request }) => {
    // A cancelled or failed upload must never reload the editor.
    let loads = 0;
    page.on("framenavigated", (f) => f === page.mainFrame() && loads++);
    reloads = () => loads;
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.context().route(/supabase\.co|cdn\.jsdelivr\.net/, (route) => route.abort());
    await page.goto("/admin/");
    await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await rail(page, "Media").click();
    await expect(flyout(page).locator(".ed-medialib-drop")).toBeVisible();
    await expect(flyout(page).getByText("Loading…")).toHaveCount(0);
  });

  test("the library shows a drop box, and says 'Drop to upload' while files are dragged over it", async ({ page }) => {
    const drop = flyout(page).locator(".ed-medialib-drop");
    await expect(drop).toContainText("Drop files here, or click to choose");
    const dt = await bigFile(page, "clip.mp4", "video/mp4");
    await flyout(page).locator(".ed-medialib").dispatchEvent("dragover", { dataTransfer: dt });
    await expect(flyout(page).locator(".ed-medialib-over")).toContainText("Drop to upload");
    await page.screenshot({ path: `${shots}/drop-over.png`, clip: (await flyout(page).boundingBox())! });
  });

  test("an upload shows its progress; Cancel stops it and says so; nothing is added", async ({ page }) => {
    // Hold the server's answer, so the upload stays in flight until it's cancelled.
    let held: Route | null = null;
    await page.route("**/api/editor/media", (route) => (route.request().method() === "POST" ? void (held = route) : route.continue()));
    const before = await flyout(page).locator(".ed-masonry-item").count();
    await flyout(page).locator('input[type="file"]').setInputFiles({ name: "long-clip.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(3 * 1024 * 1024) });
    const row = tray(page).locator(".ed-upload", { hasText: "long-clip.mp4" });
    await expect(row).toHaveAttribute("data-upload", "uploading");
    await expect(row.getByRole("progressbar")).toBeVisible();
    await expect(row.locator(".ed-upload-note")).toContainText("of 3.0 MB");
    await expect(tray(page).locator(".ed-uploads-head")).toContainText("Uploading 1 file");
    await tray(page).screenshot({ path: `${shots}/uploading.png`, animations: "disabled" });
    await row.getByRole("button", { name: "Cancel uploading long-clip.mp4" }).click();
    await expect(row).toHaveAttribute("data-upload", "cancelled");
    await expect(row).toContainText("Upload cancelled");
    await tray(page).screenshot({ path: `${shots}/cancelled.png`, animations: "disabled" });
    // it goes away by itself, and the library has nothing new
    await expect(row).toHaveCount(0, { timeout: 8000 });
    await expect(flyout(page).locator(".ed-masonry-item")).toHaveCount(before);
    expect(held).not.toBeNull();
    expect(reloads()).toBe(1);
  });

  test("a finished upload says 'Uploaded' and appears in the library", async ({ page }) => {
    const before = await flyout(page).locator(".ed-masonry-item").count();
    await flyout(page).locator('input[type="file"]').setInputFiles({ name: "upload-test.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
    const row = tray(page).locator(".ed-upload", { hasText: "upload-test.png" });
    await expect(row).toHaveAttribute("data-upload", "done");
    await expect(row).toContainText("Uploaded to the media library");
    await tray(page).screenshot({ path: `${shots}/uploaded.png`, animations: "disabled" });
    await expect(flyout(page).locator(".ed-masonry-item")).toHaveCount(before + 1);
    // clean up the test file
    await page.evaluate(async () => {
      const items = ((await (await fetch("/api/editor/media")).json()) as { items: { key: string; name: string }[] }).items;
      for (const i of items.filter((x) => x.name === "upload-test.png")) await fetch(`/api/editor/media?key=${encodeURIComponent(i.key)}`, { method: "DELETE" });
    });
  });

  test("a file over 95 MB fails at once with a clear message", async ({ page }) => {
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('.ed-flyout input[type="file"]')!;
      const big = new File([new Uint8Array(1)], "huge.mov", { type: "video/quicktime" });
      Object.defineProperty(big, "size", { value: 120 * 1024 * 1024 });
      const dt = new DataTransfer();
      dt.items.add(big);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const row = tray(page).locator(".ed-upload", { hasText: "huge.mov" });
    await expect(row).toHaveAttribute("data-upload", "failed");
    await expect(row).toContainText("over 95 MB");
    await page.waitForTimeout(800);
    expect(reloads()).toBe(1);
  });
});

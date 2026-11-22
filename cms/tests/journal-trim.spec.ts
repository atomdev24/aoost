import { expect, test, type Page } from "@playwright/test";
import { draftSite, editorPassword, onBoard, resetDraft, signIn } from "./helpers";

/**
 * A journal cover exported on a big transparent canvas is trimmed when it is picked, so it fills
 * its slot like the other covers (22 Nov 2026).
 */
const password = editorPassword();
const canvas = (page: Page) => page.frameLocator("#preview-frame");

test.describe("journal cover trim", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("a cover with empty space around it is swapped for a trimmed copy", async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await expect(canvas(page).locator('.ao-b[data-ao="journals"]')).toBeAttached();
    await page.keyboard.press("Escape");

    // A 400×600 transparent picture with a 100×200 "notebook" in the middle, uploaded to the library.
    const url = await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 400;
      c.height = 600;
      const g = c.getContext("2d")!;
      g.fillStyle = "#c33";
      g.fillRect(150, 200, 100, 200);
      const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/png"));
      const form = new FormData();
      form.set("file", new File([blob], "padded-cover.png", { type: "image/png" }));
      form.set("width", "400");
      form.set("height", "600");
      return ((await (await fetch("/api/editor/media", { method: "POST", body: form })).json()) as { item: { url: string } }).item.url;
    });

    // Pick it as the first journal's mockup, by pasting its address.
    const b = await onBoard(page, canvas(page).locator('.ao-b[data-ao="journals"] .jr').first());
    await page.mouse.click(b.x + b.width / 2, b.y + 20);
    await page.locator('[class*="ArrayFieldItem-summary"]:visible').first().click();
    await page.locator(".ed-mediarow-main:visible").first().click();
    const link = page.getByLabel(/Mockup photo.*URL/);
    await link.fill(url);
    await link.press("Enter");

    // It becomes the trimmed copy (the 100×200 box plus a few pixels), and the original stays in the library.
    await expect
      .poll(async () => {
        const home = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "home");
        for (const s of home.sections) for (const n of s.children) if (n.type === "AoostJournals") return n.content.journals[0].mockup as string;
        return "";
      }, { timeout: 15_000 })
      .toMatch(/padded-cover-trimmed/);
    const size = await page.evaluate(async () => {
      const list = ((await (await fetch("/api/editor/media")).json()) as { items: { name: string; width?: number; height?: number }[] }).items;
      const t = list.find((i) => i.name.includes("padded-cover-trimmed"));
      return t ? [t.width, t.height] : null;
    });
    expect(size).toEqual([108, 208]);
  });
});

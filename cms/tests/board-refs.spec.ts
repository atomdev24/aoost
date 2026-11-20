import { expect, test } from "@playwright/test";
import { bearer, editorPassword, resetDraft, signIn } from "./helpers";

/**
 * Reference images on the board: pictures dropped on empty board space sit beside the frames,
 * can be moved, resized and deleted, are saved per page, and never reach the site.
 */
const password = editorPassword();
const SRC = "/art/clover-metal.png";

test.describe("board references", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1512, height: 900 } });

  test("drop a picture beside the frames, move it, delete it; it is saved for the page and never published", async ({ page, request }) => {
    await resetDraft(request, password!);
    await request.put("/api/editor/refs", { headers: bearer(password!), data: { page: "home", items: [] } });
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.waitForSelector(".bd-frame-active iframe");

    // Drop an item from the media library on empty board space (bottom left, away from the frames).
    const board = await page.locator(".bd").boundingBox();
    const at = { x: board!.x + 120, y: board!.y + board!.height - 120 };
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.classList.contains("bd"), [at.x, at.y])).toBe(true);
    await page.evaluate(
      ([x, y, src]) => {
        const dt = new DataTransfer();
        dt.setData("application/x-aoost-media", JSON.stringify({ url: src, kind: "image", width: 720, height: 689, name: "clover" }));
        const host = document.querySelector(".bd")!;
        host.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, clientX: x as number, clientY: y as number, bubbles: true, cancelable: true }));
        host.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, clientX: x as number, clientY: y as number, bubbles: true, cancelable: true }));
      },
      [at.x, at.y, SRC] as const,
    );
    const ref = page.locator(".bd-ref");
    await expect(ref).toHaveCount(1);
    await expect(ref.locator("img")).toHaveAttribute("src", SRC);
    await expect(page.locator(".bd-ref-tag")).toHaveText("Reference · not on the site");

    // Saved for this page.
    const saved = async () => (await (await request.get("/api/editor/refs?page=home", { headers: bearer(password!) })).json()).items as { x: number; y: number; w: number; h: number }[];
    await expect.poll(async () => (await saved()).length).toBe(1);
    const before = (await saved())[0]!;
    expect(before.w).toBe(600); // fitted to 600 on the long edge, shape kept
    expect(before.h).toBe(574);

    // Drag it 100px right on screen: it moves 100/zoom in board pixels.
    const zoom = Number(await page.locator(".bd").getAttribute("data-zoom"));
    const box = await ref.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 100, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();
    // Within a pixel: the drag lands on whole screen pixels, so the board position can round either way.
    await expect.poll(async () => Math.abs((await saved())[0]!.x - before.x - 100 / zoom)).toBeLessThanOrEqual(1);

    // Never on the site: not in the draft's content and not in the preview.
    const site = (await (await request.get("/api/editor/site", { headers: bearer(password!) })).json()).site;
    expect(JSON.stringify(site)).not.toContain("ref-");
    expect(await (await request.get("/preview/")).text()).not.toContain("bd-ref");

    // Delete removes it (and leaves the page's blocks alone).
    await ref.click();
    await page.keyboard.press("Delete");
    await expect(ref).toHaveCount(0);
    await expect.poll(async () => (await saved()).length).toBe(0);
    const after = (await (await request.get("/api/editor/site", { headers: bearer(password!) })).json()).site;
    expect(after.pages.find((p: { id: string }) => p.id === "home").sections.length).toBe(site.pages.find((p: { id: string }) => p.id === "home").sections.length);
  });

  test("bad items are refused, the list is per page", async ({ request }) => {
    const put = await request.put("/api/editor/refs", { headers: bearer(password!), data: { page: "home", items: [{ id: "x", src: "javascript:1", x: 0, y: 0, w: 50, h: 50 }, { id: "y", src: "/m.png", x: 0, y: 0, w: 50, h: 50 }] } });
    expect((await put.json()).items.map((r: { id: string }) => r.id)).toEqual(["y"]);
    expect((await (await request.get("/api/editor/refs?page=diary", { headers: bearer(password!) })).json()).items).toEqual([]);
    expect((await request.get("/api/editor/refs?page=../x", { headers: bearer(password!) })).status()).toBe(400);
    await request.put("/api/editor/refs", { headers: bearer(password!), data: { page: "home", items: [] } });
  });
});

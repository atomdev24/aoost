import { expect, test } from "@playwright/test";
import { editorPassword, signIn } from "./helpers";

/**
 * A trackpad pinch (ctrl + wheel in Chrome) anywhere in the editor zooms the board, never the
 * browser page. Before, a pinch over the top bar, the rail, a panel, the zoom bar or a dialog
 * zoomed the whole page instead, pushing the toolbars out of sight.
 */
const password = editorPassword();

test.describe("pinch guard", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1512, height: 900 } });

  test("pinching over the toolbars, rail, zoom bar and a dialog leaves the browser's own zoom alone", async ({ page }) => {
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.waitForSelector(".bd-frame-active iframe");
    // Chrome zooms the page itself for any pinch (ctrl + wheel) the page doesn't cancel. Automated
    // Chrome never shows that zoom, so check the cause: every pinch event must end up cancelled.
    await page.evaluate(() => {
      const w = window as unknown as { __pinch: { prevented: number; missed: string[] } };
      w.__pinch = { prevented: 0, missed: [] };
      addEventListener("wheel", (e) => {
        if (!e.ctrlKey) return;
        if (e.defaultPrevented) w.__pinch.prevented++;
        else w.__pinch.missed.push((e.target as Element).className?.toString().slice(0, 40) || (e.target as Element).tagName);
      }, { passive: true });
    });
    const pinchAt = async (x: number, y: number) => {
      await page.mouse.move(x, y);
      await page.keyboard.down("Control");
      for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -30);
      for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 30);
      await page.keyboard.up("Control");
      await page.waitForTimeout(100);
    };
    const centre = async (sel: string) => {
      const b = (await page.locator(sel).first().boundingBox())!;
      return [b.x + b.width / 2, b.y + b.height / 2] as const;
    };
    for (const sel of [".ed-island-right", ".ed-island-center", ".ed-island-left", ".ed-rail", ".bd-zoombar"]) {
      const [x, y] = await centre(sel);
      await pinchAt(x, y);
    }
    await page.keyboard.press("Shift+?");
    await page.waitForTimeout(200);
    await pinchAt(756, 450);
    await page.keyboard.press("Escape");
    const result = await page.evaluate(() => (window as unknown as { __pinch: { prevented: number; missed: string[] } }).__pinch);
    expect(result.missed, "pinches that would zoom the browser page").toEqual([]);
    expect(result.prevented).toBeGreaterThan(50);
  });

  test("if the browser's own zoom is on anyway, a notice says how to undo it, and a pinch goes to the browser so pinching out works", async ({ page }) => {
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.waitForSelector(".ed-island-right");
    await expect(page.locator(".ed-zoom-notice")).toHaveCount(0);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.7 });
    const notice = page.locator(".ed-zoom-notice");
    await expect(notice).toContainText("Pinch out");
    // Inside the part of the page that's actually visible.
    const inView = await page.evaluate(() => {
      const r = document.querySelector(".ed-zoom-notice")!.getBoundingClientRect();
      const v = visualViewport!;
      return r.top >= v.offsetTop - 1 && r.bottom <= v.offsetTop + v.height + 1 && r.left >= v.offsetLeft - 1 && r.right <= v.offsetLeft + v.width + 1;
    });
    expect(inView).toBe(true);
    // While zoomed, a pinch belongs to the browser (so pinching out undoes it): not cancelled, board untouched.
    const zoomText = await page.locator(".bd-zoombar").innerText();
    const passed = await page.evaluate(() => {
      const e = new WheelEvent("wheel", { ctrlKey: true, deltaY: 20, bubbles: true, cancelable: true });
      document.querySelector(".ed-island-right")!.dispatchEvent(e);
      const b = new WheelEvent("wheel", { ctrlKey: true, deltaY: 20, bubbles: true, cancelable: true, clientX: 600, clientY: 500 });
      document.querySelector(".bd")!.dispatchEvent(b);
      return !e.defaultPrevented && !b.defaultPrevented;
    });
    expect(passed).toBe(true);
    await page.waitForTimeout(300);
    expect(await page.locator(".bd-zoombar").innerText()).toBe(zoomText);
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
    await expect(notice).toHaveCount(0);
  });
});

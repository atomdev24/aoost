import { expect, test, type Page } from "@playwright/test";
import { bearer, editorPassword, mcpCall, onBoard, resetDraft, signIn } from "./helpers";

/**
 * Pictures always cover their frame: in Free mode, dragging the hero artwork
 * far left in the Mobile frame stops where its right edge meets the frame's.
 * Holding Alt lets it leave a gap. Also checks the draft reports how it stands
 * against the live site (no conflicts, not blocked, after a reset).
 */
const password = editorPassword();
const editable = (page: Page) => page.frameLocator("#preview-frame");
const HERO_IMG = "#reel .hr-slide img";
const FREE = { fit: "free", focalX: 50, focalY: 50, zoom: 1.4, panX: 0, panY: 0 };

type Box = { x: number; y: number; width: number; height: number };
const covers = (pic: Box, frame: Box) => pic.x <= frame.x + 1 && pic.y <= frame.y + 1 && pic.x + pic.width >= frame.x + frame.width - 1 && pic.y + pic.height >= frame.y + frame.height - 1;

test.describe("pictures cover their frame", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    const r = await mcpCall(request, password!, "update_node", { page: "home", node_id: "home-hero-block", content: { reel: [{ src: "/art/hero.jpg", alt: "", frame: { base: FREE } }] } });
    expect(r.isError).toBeFalsy();
    await signIn(page, password!);
    await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
    await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
    await page.goto("/admin/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/admin/");
    await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
    await page.keyboard.press("Escape");
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  async function adjustHero(page: Page) {
    await page.getByRole("button", { name: "Edit the Mobile frame" }).click();
    await expect(page.getByRole("button", { name: "Edit the Mobile frame" })).toHaveAttribute("aria-pressed", "true");
    const img = editable(page).locator(HERO_IMG).first();
    await expect(img).toHaveJSProperty("complete", true);
    const b = await onBoard(page, img);
    await page.mouse.dblclick(b.x + b.width / 2, b.y + Math.min(b.height, 200) / 2);
    await expect(page.locator(".ed-adjust-hit")).toBeVisible();
    await expect(page.locator(".ed-adjust-tag")).toContainText("Alt: free move");
    const frame = (await page.locator(".ed-adjust-frame").boundingBox())!;
    return { frame, cx: frame.x + frame.width / 2, cy: frame.y + Math.min(frame.height, 200) / 2 };
  }
  const ghost = async (page: Page) => (await page.locator(".ed-adjust-ghost").boundingBox())!;

  test("dragging the hero far left in the Mobile frame keeps it covering the frame", async ({ page }) => {
    const { frame, cx, cy } = await adjustHero(page);
    expect(covers(await ghost(page), frame)).toBe(true);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 1500, cy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const pic = await ghost(page);
    expect(covers(pic, frame)).toBe(true);
    // It went as far as it can: the picture's right edge sits on the frame's.
    expect(Math.abs(pic.x + pic.width - (frame.x + frame.width))).toBeLessThan(2);

    // Scrolling down to shrink it stops at cover.
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 400);
    await expect(page.locator(".ed-adjust-tag")).toContainText("100%");
    expect(covers(await ghost(page), frame)).toBe(true);
  });

  test("holding Alt lets the picture leave a gap", async ({ page }) => {
    const { frame, cx, cy } = await adjustHero(page);
    await page.keyboard.down("Alt");
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 1500, cy, { steps: 12 });
    await page.mouse.up();
    await page.keyboard.up("Alt");
    await page.waitForTimeout(300);
    expect(covers(await ghost(page), frame)).toBe(false);
  });

  test("the draft reports how it stands against the live site", async ({ request }) => {
    const res = await request.get("/api/editor/state", { headers: bearer(password!) });
    const { sync } = await res.json();
    expect(sync).toMatchObject({ conflicts: [], blocked: null });
    const none = await request.post("/api/editor/conflict", { headers: bearer(password!), data: { id: "nope", choice: "live" } });
    expect(none.ok()).toBe(true);
    const bad = await request.post("/api/editor/conflict", { headers: bearer(password!), data: { id: "nope", choice: "maybe" } });
    expect(bad.status()).toBe(400);
  });
});

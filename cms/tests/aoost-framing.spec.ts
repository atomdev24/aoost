import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { draftSite, editorPassword, mcpCall, onBoard, resetDraft, signIn } from "./helpers";

/**
 * Per-screen-size framing of the pictures inside the aoost blocks: double-click the hero
 * artwork in the Mobile frame, drag it, and only mobile changes. "Reset to desktop" undoes that.
 * The screenshot goes to docs/screenshots/aoost-framing.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/aoost-framing");
const editable = (page: Page) => page.frameLocator("#preview-frame");
const desktopFrame = (page: Page) => page.frameLocator('iframe.bd-live[data-bp="desktop"]');
const inspector = (page: Page) => page.locator(".ed-inspector");
const scope = (page: Page) => page.locator(".ed-scope");
const HERO_IMG = "#reel .hr-slide img";

type Frame = { base: Record<string, unknown>; desktop?: Record<string, unknown> };
async function heroFrame(request: Parameters<typeof draftSite>[0]): Promise<Frame | undefined> {
  const home = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "home");
  for (const s of home.sections) for (const n of s.children) if (n.type === "AoostHero") return n.content.reel[0].frame;
  return undefined;
}
const objectPosition = (page: Page, frame: ReturnType<typeof editable>) => frame.locator(HERO_IMG).first().evaluate((el) => getComputedStyle(el).objectPosition);

async function openEditor(page: Page) {
  await page.goto("/admin/");
  await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
  await page.keyboard.press("Escape");
}

test.describe("aoost image framing", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeAll(() => mkdirSync(shots, { recursive: true }));
  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    // A reel picture that is always there locally (the published one lives in R2).
    const r = await mcpCall(request, password!, "update_node", { page: "home", node_id: "home-hero-block", content: { reel: [{ src: "/art/hero.jpg", alt: "" }] } });
    expect(r.isError).toBeFalsy();
    await signIn(page, password!);
    // Never write to the live Supabase project.
    await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
    await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
    await page.goto("/admin/");
    await page.evaluate(() => localStorage.clear());
    await openEditor(page);
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test.fixme("adjusting the hero in the Mobile frame changes mobile only; Reset to desktop restores it", async ({ page, request }) => { // drifted; see ROADMAP "Tests to rewrite"
    await page.getByRole("button", { name: "Edit the Mobile frame" }).click();
    await expect(page.getByRole("button", { name: "Edit the Mobile frame" })).toHaveAttribute("aria-pressed", "true");
    const img = editable(page).locator(HERO_IMG).first();
    await expect(img).toHaveJSProperty("complete", true);
    expect(await objectPosition(page, editable(page))).toBe("50% 50%");

    // Double-click the artwork: adjust mode for that picture, in the Mobile frame.
    const b = await onBoard(page, img);
    await page.mouse.dblclick(b.x + b.width / 2, b.y + Math.min(b.height, 200) / 2);
    const hit = page.locator(".ed-adjust-hit");
    await expect(hit).toBeVisible();
    await expect(page.locator(".ed-adjust-tag")).toContainText("Artwork 1");
    const h = (await page.locator(".ed-adjust-frame").boundingBox())!;
    const cx = h.x + h.width / 2;
    const cy = h.y + Math.min(h.height, 200) / 2;
    // Two drags in one session.
    for (const dx of [-40, -30]) {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + dx, cy, { steps: 6 });
      await page.mouse.up();
    }
    await page.waitForTimeout(300);
    mkdirSync(shots, { recursive: true });
    await page.screenshot({ path: `${shots}/hero-mobile-adjust.png` });
    await page.keyboard.press("Escape");
    await expect(hit).toHaveCount(0);

    // Stored as a mobile override: the base (mobile) moved, desktop keeps the centre.
    await expect.poll(async () => (await heroFrame(request))?.desktop).toEqual({ focalX: 50 });
    const frame = (await heroFrame(request))!;
    expect(frame.base.focalX).not.toBe(50);
    expect(frame.base.focalY).toBe(50);

    // The mobile picture moved; the desktop one didn't.
    await expect.poll(() => objectPosition(page, editable(page))).not.toBe("50% 50%");
    await expect.poll(() => objectPosition(page, desktopFrame(page))).toBe("50% 50%");

    // The hero is still selected and the scope bar counts the change (on top of the Align override the hero already has).
    await expect(inspector(page)).toBeVisible();
    await expect(scope(page)).toHaveText(/Editing Mobile · 2 changes/);

    // The whole adjust session (two drags) is one undo step.
    await page.locator('.ed-icon[aria-label="Undo"]').click();
    await expect(scope(page)).toHaveText(/Editing Mobile · 1 change/);
    await expect.poll(() => objectPosition(page, editable(page))).toBe("50% 50%");
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(scope(page)).toHaveText(/Editing Mobile · 2 changes/);

    // The reel item's picture row is tinted; its label offers "Reset to desktop".
    await page.locator('[class*="ArrayFieldItem-summary"]:visible', { hasText: "hero.jpg" }).click();
    const row = inspector(page).locator(".ed-mediarow.is-over");
    await expect(row).toHaveCount(1);
    await inspector(page).locator(".ed-label.is-over", { hasText: "Image" }).click();
    await expect(page.getByRole("menu")).toContainText("Use on all sizes");
    await page.getByRole("menuitem", { name: "Reset to desktop" }).click();
    await expect(scope(page)).toHaveText(/Editing Mobile · 1 change/);
    await expect(row).toHaveCount(0);
    await expect.poll(async () => (await heroFrame(request))?.desktop).toBeUndefined();
    expect((await heroFrame(request))!.base.focalX).toBe(50);
    await expect.poll(() => objectPosition(page, editable(page))).toBe("50% 50%");
  });

  test.fixme("the hero picture's popover sets the mobile focal point", async ({ page, request }) => { // drifted; see ROADMAP "Tests to rewrite"
    await page.getByRole("button", { name: "Edit the Mobile frame" }).click();
    await expect(page.getByRole("button", { name: "Edit the Mobile frame" })).toHaveAttribute("aria-pressed", "true");
    const img = editable(page).locator(HERO_IMG).first();
    const b = await onBoard(page, img);
    await page.mouse.click(b.x + b.width / 2, b.y + Math.min(b.height, 200) / 2);
    await page.locator('[class*="ArrayFieldItem-summary"]:visible', { hasText: "hero.jpg" }).click();
    await inspector(page).getByRole("button", { name: /Image: hero\.jpg/ }).click();
    const pop = page.locator(".ed-mediapop");
    await expect(pop).toBeVisible();
    await expect(pop.getByRole("group", { name: "Content fit" })).toBeVisible();
    await expect(pop.getByLabel("Alt text")).toBeVisible();
    const focal = (await pop.getByRole("slider", { name: "Focal point" }).boundingBox())!;
    await page.mouse.click(focal.x + focal.width * 0.2, focal.y + focal.height * 0.5);
    await expect.poll(async () => (await heroFrame(request))?.base.focalX).toBe(20);
    expect((await heroFrame(request))!.desktop).toEqual({ focalX: 50 });
    await expect.poll(() => objectPosition(page, desktopFrame(page))).toBe("50% 50%");
  });
});

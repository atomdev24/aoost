import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { draftSite, editorPassword, mcpCall, onBoard, resetDraft, signIn } from "./helpers";

/**
 * Tablet and widescreen as full breakpoints (BREAKPOINTS-TABLET-WIDE.md): the hidden frames,
 * an edit on Tablet that leaves Desktop and Mobile alone, its reset, and adjusting the hero
 * picture on Widescreen. The screenshot goes to docs/screenshots/breakpoints.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/breakpoints");
const editable = (page: Page) => page.frameLocator("#preview-frame");
const live = (page: Page, bp: string) => page.frameLocator(`.bd-live[data-bp="${bp}"]`);
const island = (page: Page, name: string) => page.locator(".ed-island-bps").getByRole("button", { name, exact: true });
const scope = (page: Page) => page.locator(".ed-scope");
type R = { base: Record<string, unknown>; desktop?: Record<string, unknown>; tablet?: Record<string, unknown>; widescreen?: Record<string, unknown> };
type Req = Parameters<typeof draftSite>[0];
const sectionLayout = async (request: Req, id: string): Promise<R> =>
  (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "sample").sections.find((s: { id: string }) => s.id === id).layout;
async function heroFrame(request: Req): Promise<R | undefined> {
  const home = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "home");
  for (const s of home.sections) for (const n of s.children) if (n.type === "AoostHero") return n.content.reel[0].frame;
  return undefined;
}
const cols = (n: number) => new RegExp(`^${Array(n).fill("\\S+").join("\\s")}$`);

test.describe("tablet and widescreen breakpoints", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    // Never write to the live Supabase project.
    await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
    await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test.fixme("columns changed on Tablet leave Desktop and Mobile alone, count in the scope bar, and reset", async ({ page, request }) => { // drifted; see ROADMAP "Tests to rewrite"
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(editable(page).locator(".n-sample-title")).toBeVisible();
    await page.keyboard.press("Escape");

    // Tablet and Widescreen start hidden.
    await expect(page.locator('.bd-frame:not(.vr-frame)[data-bp="tablet"]')).toHaveCount(0);
    await expect(page.locator('.bd-frame:not(.vr-frame)[data-bp="widescreen"]')).toHaveCount(0);

    const added = await mcpCall(request, password!, "add_section", { page: "sample", kind: "grid", name: "Test grid", index: 1, layout: { columns: 3 }, nodes: [{ type: "Text", content: { text: "Cell one" } }, { type: "Text", content: { text: "Cell two" } }] });
    const id = /"sectionId":\s*"([^"]+)"/.exec(added.content[0]!.text!)![1]!;

    // Show the Tablet frame from the centre island; it becomes the editable frame.
    await island(page, "Tablet").click();
    await expect(island(page, "Tablet")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.bd-frame:not(.vr-frame)[data-bp="tablet"]')).toBeVisible();
    await expect.poll(() => editable(page).locator("html").evaluate((el) => el.ownerDocument.defaultView!.innerWidth)).toBe(834);

    await page.locator(".ed-rail").getByRole("button", { name: "Layers", exact: true }).click();
    await page.locator(".ed-layer-name", { hasText: "Test grid" }).click();
    await expect(page.locator(".ed-inspector-title strong")).toHaveText("Test grid");
    await page.keyboard.press("Escape");
    await expect(scope(page)).toHaveText(/Editing Tablet · 0 changes/);

    await page.getByRole("group", { name: "Split into columns" }).getByRole("button", { name: "2", exact: true }).click();
    await expect.poll(async () => {
      const l = await sectionLayout(request, id);
      return [l.base.columns, l.desktop?.columns, l.tablet?.columns, l.widescreen];
    }).toEqual([3, undefined, 2, undefined]);
    await expect(scope(page)).toHaveText(/Editing Tablet · 1 change/);
    await expect(page.locator(".ed-inspector .ed-label.is-over", { hasText: "Columns" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit the Tablet frame" }).locator(".bd-badge")).toHaveText("1 override");

    // Tablet shows two columns; Desktop and Mobile still show three.
    await expect(editable(page).locator(`.s#${id} > .si`)).toHaveCSS("grid-template-columns", cols(2));
    await expect(live(page, "desktop").locator(`.s#${id} > .si`)).toHaveCSS("grid-template-columns", cols(3));
    await expect(live(page, "mobile").locator(`.s#${id} > .si`)).toHaveCSS("grid-template-columns", cols(3));

    // The label menu offers the size Tablet inherits from.
    await page.locator(".ed-inspector .ed-label.is-over", { hasText: "Columns" }).click();
    await expect(page.getByRole("menu")).toContainText("Use on all sizes");
    await expect(page.getByRole("menu")).toContainText("Mobile: 3");
    await page.getByRole("menuitem", { name: "Reset to mobile" }).click();
    await expect.poll(async () => (await sectionLayout(request, id)).tablet).toBeUndefined();
    expect((await sectionLayout(request, id)).base.columns).toBe(3);
    await expect(scope(page)).toHaveText(/Editing Tablet · 0 changes/);
    await expect(page.locator(".ed-inspector .ed-label.is-over", { hasText: "Columns" })).toHaveCount(0);
    await expect(editable(page).locator(`.s#${id} > .si`)).toHaveCSS("grid-template-columns", cols(3));

    // The shown frame is remembered for this page.
    await page.waitForTimeout(400);
    await page.reload();
    await expect(page.locator('.bd-frame:not(.vr-frame)[data-bp="tablet"]')).toBeVisible();
  });

  test("adjusting the hero picture on Widescreen writes only the widescreen frame", async ({ page, request }) => {
    const r = await mcpCall(request, password!, "update_node", { page: "home", node_id: "home-hero-block", content: { reel: [{ src: "/art/hero.jpg", alt: "" }] } });
    expect(r.isError).toBeFalsy();
    await page.goto("/admin/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(editable(page).locator("[data-puck-component]").first()).toBeVisible();
    await page.keyboard.press("Escape");

    await island(page, "Widescreen").click();
    await expect(island(page, "Widescreen")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => editable(page).locator("html").evaluate((el) => el.ownerDocument.defaultView!.innerWidth)).toBe(1920);
    const img = editable(page).locator("#reel .hr-slide img").first();
    await expect(img).toHaveJSProperty("complete", true);

    const b = await onBoard(page, img);
    await page.mouse.dblclick(b.x + b.width / 2, b.y + Math.min(b.height, 200) / 2);
    const hit = page.locator(".ed-adjust-hit");
    await expect(hit).toBeVisible();
    const h = (await page.locator(".ed-adjust-frame").boundingBox())!;
    const cx = h.x + h.width / 2;
    const cy = h.y + Math.min(h.height, 200) / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    // At 1920 wide the picture overflows one way only, so drag both ways.
    await page.mouse.move(cx - 60, cy - 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await expect(hit).toHaveCount(0);

    await expect.poll(async () => (await heroFrame(request))?.widescreen).toBeDefined();
    const frame = (await heroFrame(request))!;
    expect(Object.keys(frame.widescreen!).some((k) => k === "focalX" || k === "focalY")).toBe(true);
    expect(frame.desktop).toBeUndefined();
    expect(frame.tablet).toBeUndefined();
    expect([frame.base.focalX ?? 50, frame.base.focalY ?? 50]).toEqual([50, 50]);
    await expect(scope(page)).toHaveText(/Editing Widescreen · 1 change/);
    // Desktop's picture didn't move.
    await expect.poll(() => live(page, "desktop").locator("#reel .hr-slide img").first().evaluate((el) => getComputedStyle(el).objectPosition)).toBe("50% 50%");
  });

  test("screenshot: all four frames", async ({ page }) => {
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(editable(page).locator(".n-sample-title")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.locator(".bd-slot").getByRole("button", { name: /Tablet/ }).click();
    await page.locator(".bd-slot").getByRole("button", { name: /Widescreen/ }).click();
    await island(page, "Desktop").click();
    await expect(page.locator(".bd-slot")).toHaveCount(0);
    await page.getByRole("button", { name: "Fit all" }).click();
    // Off-screen frames draw nothing, so check them once everything is in view.
    for (const bp of ["widescreen", "tablet", "mobile"]) await expect(live(page, bp).locator(".n-sample-title")).toBeVisible();
    await page.waitForTimeout(1500);
    mkdirSync(shots, { recursive: true });
    await page.screenshot({ path: `${shots}/four-frames.png` });
  });
});

import { expect, test, type Page } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clearArea, draftSite, editorPassword, mcpCall, onBoard, resetDraft, signIn } from "./helpers";

const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots");
const canvas = (page: Page) => page.frameLocator("#preview-frame");

type Block = { type: string; content: Record<string, any> };
const homeBlocks = async (request: Parameters<typeof draftSite>[0]) => {
  const home = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "home");
  return { sections: home.sections as { id: string; hidden?: unknown; children: Block[] }[], block: (type: string) => home.sections.map((s: { children: Block[] }) => s.children[0]).find((n: Block) => n.type === type) as Block };
};

/** Click a block on the editor canvas to select it. */
async function select(page: Page, selector: string) {
  const b = await onBoard(page, canvas(page).locator(selector));
  // The middle of its visible part: the corner can sit under the name tag, the right side under the inspector.
  const area = await clearArea(page);
  const x = (Math.max(b.x, area.left) + Math.min(b.x + b.width, area.right)) / 2;
  const y = (Math.max(b.y, area.top) + Math.min(b.y + b.height, area.bottom)) / 2;
  await page.mouse.click(x, y);
}

test.describe("homepage in the editor", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
    // Never write to the live Supabase project from a test.
    await page.context().route(/supabase\.co/, (route) => (route.request().method() === "GET" && !route.request().url().includes("/visits") ? route.continue() : route.abort()));
    await page.context().route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
    await page.goto("/admin/");
    await expect(canvas(page).locator('.ao-b[data-ao="projects"] h2')).toBeVisible();
    await page.keyboard.press("Escape"); // close the remembered (unpinned) flyout so the frame is clear
  });
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("the aoost blocks sit in their own group in the Add panel", async ({ page }) => {
    await page.locator(".ed-rail").getByRole("button", { name: "Insert", exact: true }).click();
    await page.getByRole("tab", { name: "Blocks" }).click();
    await expect(page.getByText("aoost (homepage blocks)").first()).toBeVisible();
  });

  test("change a project title, swap a reel image, add a playlist, reorder two sections, hide the skills: all of it shows in the preview", async ({ page, request }) => {
    // 1. a project's title
    await select(page, '.ao-b[data-ao="projects"] h2');
    await page.locator('[class*="ArrayFieldItem-summary"]:visible', { hasText: "hero.jpg" }).click();
    await page.locator('input[name="projects[0].title"]:visible').fill("Fire breather");
    await expect.poll(async () => (await homeBlocks(request)).block("AoostProjects").content.projects[0].title).toBe("Fire breather");

    // 2. the first reel image
    await select(page, '.ao-b[data-ao="hero"] #reel');
    await page.locator('[class*="ArrayFieldItem-summary"]:visible', { hasText: "hero.jpg" }).click();
    const image = page.locator('input[aria-label="Image"]:visible').first();
    await image.fill("/art/grillz.jpg");
    await image.press("Tab");
    await expect.poll(async () => (await homeBlocks(request)).block("AoostHero").content.reel[0].src).toBe("/art/grillz.jpg");
    await expect(canvas(page).locator("#reel img").first()).toHaveAttribute("src", /grillz/);

    // 3. a fourth playlist
    await select(page, '.ao-b[data-ao="playlists"] #h-pl');
    await page.locator('[class*="ArrayField-addButton"]:visible').first().click();
    const title = page.locator('input[name="playlists[3].title"]:visible');
    if (!(await title.count())) await page.locator('[class*="ArrayFieldItem-summary"]:visible', { hasText: "New playlist" }).click();
    await title.fill("Sunday");
    await page.locator('input[name="playlists[3].spotify"]:visible').fill("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc");
    await expect.poll(async () => (await homeBlocks(request)).block("AoostPlaylistBand").content.playlists.length).toBe(4);
    await expect(canvas(page).locator("#discs .cv-frame")).toHaveCount(4);
    await expect(canvas(page).locator("#discs .cv-fl").nth(3)).toHaveText("Disc 4 · Sunday");

    // 4. skills above journals, 5. then hide the skills (on desktop and on mobile)
    await page.locator(".ed-rail").getByRole("button", { name: "Layers", exact: true }).click();
    await page.getByRole("button", { name: "Move Skills up" }).click();
    await expect.poll(async () => (await homeBlocks(request)).sections.map((s) => s.id).slice(1, 4)).toEqual(["home-projects", "home-tools", "home-journals"]);
    await page.screenshot({ path: `${shots}/editor-home-1440.png` });
    await page.getByRole("button", { name: "Hide Skills on desktop" }).click();
    await page.locator(".ed-island-bps").getByRole("button", { name: "Mobile" }).click();
    await page.getByRole("button", { name: "Hide Skills on mobile" }).click();
    await expect(page.locator(".ed-status")).toHaveText("Draft · saved just now");

    // The draft, rendered like the live site
    await page.goto("/preview/");
    await expect(page.locator("#table .piece")).toHaveCount(7);
    expect(await page.locator(".ao-b").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.ao)).then((a) => a.slice(0, 4))).toEqual(["hero", "projects", "tools", "journals"]);
    await expect(page.locator('.ao-b[data-ao="tools"]')).toBeHidden();
    await expect(page.locator('.ao-b[data-ao="journals"]')).toBeVisible();
    await expect(page.locator("#reel .hr-slide img").first()).toHaveAttribute("src", /grillz/);
    await page.locator("#discs").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await expect(page.locator("#discs .cv-frame")).toHaveCount(4);
    await page.locator("#discs .disc").nth(3).click();
    await expect(page.locator("#mwOpen")).toHaveAttribute("href", "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
    await page.locator("#table .piece").first().evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.locator("#table .piece").first().click();
    await expect(page.locator("#viewer")).toContainText("Fire breather");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.ao-b[data-ao="tools"]')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("Claude can read and edit the blocks' fields through /mcp, and bad values are refused", async ({ page, request }) => {
    const got = JSON.parse((await mcpCall(request, password!, "get_page", { page: "home" })).content[0]!.text!);
    expect(JSON.stringify(got)).toContain("AoostRodeo");

    const tools = (await homeBlocks(request)).block("AoostTools").content.tools;
    const ok = await mcpCall(request, password!, "update_node", { node_id: "home-tools-block", content: { heading: "tools", tools: [...tools, { abbr: "Pr", name: "Procreate", level: "Daily", value: 80 }] } });
    expect(ok.isError).toBeFalsy();
    await expect(canvas(page).locator("#h-tools")).toHaveText("tools", { timeout: 3000 }); // live in the open editor
    await expect(canvas(page).locator(".sk-list li")).toHaveCount(7);

    const bad = await mcpCall(request, password!, "update_node", { node_id: "home-tools-block", content: { tools: [{ abbr: "Pr", name: "Procreate", level: "Daily", value: 400 }] } });
    expect(bad.isError).toBe(true);
    expect((await homeBlocks(request)).block("AoostTools").content.tools).toHaveLength(7);
  });
});

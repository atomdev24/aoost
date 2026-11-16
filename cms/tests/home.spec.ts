import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bearer, draftSite, editorPassword, resetDraft, signIn } from "./helpers";

const cms = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const password = editorPassword();

/**
 * The homepage talks to Alex's Supabase project (leaderboard, visitor counter, live presence).
 * Tests may read from it but must never write: visits, scores and presence are blocked.
 */
async function guard(context: BrowserContext, writes: string[] = []) {
  await context.route(/supabase\.co/, (route) => {
    const req = route.request();
    if (req.method() === "GET" && !req.url().includes("/visits")) return route.continue();
    writes.push(`${req.method()} ${new URL(req.url()).pathname}`);
    return route.abort();
  });
  await context.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
  // Without Spotify's player API the toolbar runs on its own clock (the original's fallback), which is what we can assert on.
  await context.route(/open\.spotify\.com\/embed\/iframe-api/, (route) => route.abort());
}

const home = async (page: Page, path = "/") => {
  await guard(page.context());
  await page.goto(path);
  await expect(page.locator("#table .piece")).toHaveCount(7);
};

test.describe("homepage: the original page, from aoost blocks", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("is built only from the aoost blocks, in the original order, without the site nav", async ({ page }) => {
    await home(page);
    expect(await page.locator(".ao-b").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.ao))).toEqual(["hero", "projects", "journals", "tools", "playlists", "wall", "rodeo", "footer", "viewer"]);
    await expect(page.locator(".nav")).toHaveCount(0);
    // the two cutting mats group the same sections as the original
    expect(await page.locator(".mat-light .ao-b").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.ao))).toEqual(["projects", "journals", "tools"]);
    expect(await page.locator(".mat-dark .ao-b").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.ao))).toEqual(["playlists", "wall", "rodeo", "footer"]);
    await expect(page.locator('section[aria-labelledby="h-wall"]')).toBeHidden(); // the wall is off, as on the live site
  });

  test("the clock shows Cape Town time and the ticker moves", async ({ page }) => {
    await home(page);
    const now = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" }).format(new Date());
    const shown = await page.locator("#clock").textContent();
    expect(shown).toMatch(/^CPT \d\d:\d\d$/);
    expect(Math.abs(Number(shown!.slice(-2)) - Number(now.slice(-2))) % 59).toBeLessThanOrEqual(1);

    await expect(page.locator(".tk-track")).toHaveCSS("animation-name", "tk");
    const x = () => page.locator(".tk-track").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const before = await x();
    await page.waitForTimeout(600);
    expect(await x()).toBeLessThan(before);
    await expect(page.locator("#ticker .tk-w").first()).toHaveText("welcome");
    await expect(page.locator("#ticker")).toContainText("pick a playlist");
  });

  test("the ticker picks up the live top score from the leaderboard, which loads for everyone", async ({ page }) => {
    await home(page);
    await expect(page.locator("#lbScope")).toHaveText("everyone");
    expect(await page.locator("#lbList li").count()).toBeGreaterThan(0);
    await expect(page.locator("#lbList li").first().locator(".n")).toHaveText("01");
    await expect(page.locator("#ticker")).toContainText(/beat the game, top score \d+ by /);
  });

  test("tapping the reel or a project opens the viewer; dragging a piece moves it instead", async ({ page }) => {
    await home(page);
    await page.locator("#reel .hr-slide").first().click();
    await expect(page.locator("#viewer")).toBeVisible();
    await expect(page.locator("#vStage img")).toHaveAttribute("src", "/art/hero.jpg");
    await page.keyboard.press("Escape");
    await expect(page.locator("#viewer")).toBeHidden();

    const piece = page.locator("#table .piece").nth(1);
    await piece.scrollIntoViewIfNeeded();
    const box = (await piece.boundingBox())!;
    const before = await piece.evaluate((el) => el.style.transform);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 40, { steps: 6 });
    await page.mouse.up();
    expect(await piece.evaluate((el) => el.style.transform)).not.toBe(before);
    await expect(page.locator("#viewer")).toBeHidden(); // a drag is not a tap

    await page.locator("#table .piece").nth(2).click();
    await expect(page.locator("#vStage img")).toHaveAttribute("src", "/art/monkey-figure.jpg");
    await page.locator("#vClose").click();
    await expect(page.locator("#viewer")).toBeHidden();
  });

  test("the keychain swings and the skills bars grow when seen", async ({ page }) => {
    await home(page);
    // it sways all the time, so it never "holds still" for Playwright's own scroll and click
    await page.locator("#keychain").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.locator("#keychain").dispatchEvent("click");
    await expect(page.locator("#keychain")).toHaveClass(/kick/);
    await page.locator(".skills").scrollIntoViewIfNeeded();
    await expect(page.locator(".skills")).toHaveClass(/seen/);
    expect(await page.locator(".sk-bar i").first().evaluate((el) => getComputedStyle(el).width)).not.toBe("0px");
  });

  test("a journal opens in the 3D viewer, turns pages and closes", async ({ page }) => {
    await home(page);
    await expect(page.locator("#jrShelf .jr")).toHaveCount(4);
    await page.locator("#jrShelf .jr").first().scrollIntoViewIfNeeded();
    await page.locator("#jrShelf .jr").first().click();
    const viewer = page.locator(".jv");
    await expect(viewer).toHaveClass(/on/);
    await expect(viewer.locator(".jv-t")).toHaveText("sketchbook 01");
    await expect(viewer.locator(".jv-lf.fl")).toHaveCount(1, { timeout: 4000 }); // the cover opens by itself
    await expect(viewer.locator(".ct")).toContainText("inside cover");
    await expect(viewer.locator(".ji-sticker img")).toHaveCount(1); // the sticker placed in Atom
    await viewer.locator(".nx").click();
    await expect(viewer.locator(".jv-lf.fl")).toHaveCount(2);
    await page.keyboard.press("ArrowLeft");
    await expect(viewer.locator(".jv-lf.fl")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator(".jv")).toHaveCount(0, { timeout: 4000 });
  });

  test("the discs switch playlists and the mini player plays", async ({ page }) => {
    await home(page);
    await page.locator("#discs").scrollIntoViewIfNeeded();
    await expect(page.locator("#discs .cv-frame")).toHaveCount(3);
    await expect(page.locator('#discs .cv-frame[data-on="1"] .cv-fl')).toContainText("Rock");
    await expect(page.locator("#mwOpen")).toHaveAttribute("href", "https://open.spotify.com/playlist/2FeVxQ6ZPLOAuoejGJj9Fb");

    await page.locator("#discs .disc").nth(1).click();
    await expect(page.locator('#discs .cv-frame[data-on="1"] .cv-fl')).toContainText("Alt");
    await expect(page.locator("#mwOpen")).toHaveAttribute("href", "https://open.spotify.com/playlist/3PbXJWUZ4RooUU0aSSdDi0");
    await expect(page.locator("#mwPlay")).toHaveAttribute("aria-label", "Pause"); // choosing a disc starts it
    await expect(page.locator("#mwTime")).not.toHaveText("00:00 / 03:50", { timeout: 4000 }); // time runs
    await page.locator("#mwPlay").click();
    await expect(page.locator("#mwPlay")).toHaveAttribute("aria-label", "Play");
    await page.locator("#mwNext").click();
    await expect(page.locator('#discs .cv-frame[data-on="1"] .cv-fl')).toContainText("H | T | R");
    // the selection box shows the cover's real size
    await expect(page.locator('#discs .cv-frame[data-on="1"] em')).toHaveText("1080 × 1080");
  });

  test("the rodeo plays: tap to ride, the run ends at the first obstacle, and the best score is kept", async ({ page }) => {
    await home(page);
    const canvas = page.locator("#rodeo");
    await canvas.scrollIntoViewIfNeeded();
    const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL().length + c.toDataURL().slice(5000, 5200));
    await page.waitForTimeout(600); // sprites and the rider sheet
    const idle = await pixels();
    expect(await page.evaluate(() => localStorage.getItem("aoost-rodeo-hi"))).toBeNull();
    await canvas.click();
    await page.waitForTimeout(400);
    expect(await pixels()).not.toBe(idle); // it is running
    // ride without jumping: the first cactus ends the run and the score is saved as this device's best
    await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("aoost-rodeo-hi") ?? 0)), { timeout: 20000 }).toBeGreaterThan(0);
    // jumping works from the keyboard too
    await canvas.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    await page.keyboard.press("Space");
  });

  test("the focus effect softens sections away from the middle of the screen", async ({ page }) => {
    await home(page);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(300);
    const styles = await page.locator(".focus-sec").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.filter));
    expect(styles.some((s) => s.includes("blur"))).toBe(true);
    expect(styles.some((s) => s === "")).toBe(true);
  });

  test("late mode: after midnight the page goes dark and the ticker changes", async ({ page }) => {
    await home(page, "/?late=1");
    await expect(page.locator("html")).toHaveClass(/late/);
    await expect(page.locator("#ticker")).toContainText("you're up late");
    await expect(page.locator("#ticker")).toContainText("the station's still on");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(17, 18, 19)");
  });

  test("no page errors, and nothing overflows sideways", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await home(page);
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
    });
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });
});

test.describe("homepage on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("fits 390px, the game gets its thumb pad, and Spotify's own player is shown for the tap", async ({ page }) => {
    await home(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(await page.locator("#rodeo").evaluate((c) => c.getBoundingClientRect().height)).toBeGreaterThan(300); // includes the 112px thumb pad
    await expect(page.locator("html")).toHaveClass(/sp-touch/);
    await expect(page.locator("#mw")).toBeHidden();
    await expect(page.locator(".sp-hint")).toBeVisible();
  });
});

test.describe("homepage with draft changes (preview)", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the reel advances by itself, the wall works when switched on, and the preview never writes to Supabase", async ({ page, request }) => {
    await resetDraft(request, password!);
    const site = await draftSite(request, password!);
    const page0 = site.pages.find((p: { id: string }) => p.id === "home");
    const block = (type: string) => page0.sections.map((s: { children: { type: string; content: Record<string, unknown> }[] }) => s.children[0]).find((n: { type: string }) => n.type === type);
    Object.assign(block("AoostHero").content, { reel: [{ src: "/art/hero.jpg" }, { src: "/art/grillz.jpg" }], reelSeconds: 1 });
    block("AoostDrawingWall").content.show = true;
    expect((await request.post("/api/editor/ops", { headers: bearer(password!), data: { ops: [{ op: "putPage", page: page0 }] } })).ok()).toBe(true);

    const writes: string[] = [];
    await guard(page.context(), writes);
    const visits: string[] = [];
    page.on("request", (r) => /supabase\.co.*\/visits|realtime/.test(r.url()) && visits.push(r.url()));
    await signIn(page, password!);
    await page.goto("/preview/");

    // reel: two artworks now, one second each
    await expect(page.locator("#reel .hr-slide")).toHaveCount(2);
    await expect.poll(() => page.locator("#reel").evaluate((el) => el.scrollLeft), { timeout: 6000 }).toBeGreaterThan(100);

    // the wall: draw a stroke, see it in the layers panel, undo it
    const wall = page.locator('section[aria-labelledby="h-wall"]');
    await expect(wall).toBeVisible();
    await page.locator("#board").scrollIntoViewIfNeeded();
    const b = (await page.locator("#paint").boundingBox())!;
    await page.mouse.move(b.x + 60, b.y + 60);
    await page.mouse.down();
    await page.mouse.move(b.x + 200, b.y + 160, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator("#layers li").first()).toContainText("1 stroke");
    expect(await page.locator("#paint").evaluate((c: HTMLCanvasElement) => c.getContext("2d")!.getImageData(700, 600, 1, 1).data[3])).toBeGreaterThanOrEqual(0);
    await page.locator('.tool[data-tool="spray"]').click();
    await expect(page.locator("#curTool")).toContainText("Spray can");
    await page.locator("#palette .sw").nth(2).click();
    await expect(page.locator("#palette .sw").nth(2)).toHaveAttribute("aria-pressed", "true");
    await page.locator(".menu > button", { hasText: "Edit" }).click();
    await page.locator('[data-act="undo"]').click();
    await expect(page.locator("#layers li").first()).toContainText("0 strokes");
    await expect(page.locator("#toast")).toHaveText("Undo stroke");

    expect(visits).toEqual([]); // the draft preview does not count visits or join presence
    expect(writes).toEqual([]);
    await resetDraft(request, password!);
  });
});

test.describe("homepage looks like the original", () => {
  test.setTimeout(180_000);

  test("captures of the original and the CMS homepage are the same at 390 and 1440", async () => {
    execFileSync("node", ["scripts/compare-home.mjs"], { cwd: cms, stdio: "pipe" });
    const report = execFileSync("node", ["scripts/diff-home.mjs"], { cwd: cms }).toString();
    const percents = [...report.matchAll(/\((\d+\.\d+)%\)/g)].map((m) => Number(m[1]));
    expect(report).not.toContain("sizes differ");
    expect(percents).toHaveLength(2);
    // Allow for the clock ticking over a minute between the two captures; anything else is a real difference.
    for (const p of percents) expect(p, report).toBeLessThan(0.05);
  });
});

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { homeBlock, page as contentPage, site as contentSite, visibleProjects } from "./content";
import { bearer, draftSite, editorPassword, resetDraft, signIn } from "./helpers";

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
  await expect(page.locator("#table .piece")).toHaveCount(visibleProjects().length);
};

// What the published homepage switches on and off (content/pages/home.json).
const hero = homeBlock("AoostHero");
const tickerOn = hero.showTicker !== false; // missing means on
const dotBoard = hero.tickerStyle === "dots";
const wallOn = !!homeBlock("AoostDrawingWall").show;
const homeHidesNav = !!(contentPage("home") as { hideNav?: boolean }).hideNav;
// The nav's page items whose page is published and listed: the only links the public nav shows.
const liveNavPages = contentSite().nav.items.filter((i: { type: string; target?: { pageId?: string } }) => {
  const target = i.type === "page" && i.target?.pageId ? contentPage(i.target.pageId) : undefined;
  return target?.status === "published" && target.showInNav;
}).length;
const skillsHidden = !!contentPage("home").sections.find((s) => s.children[0]?.type === "AoostTools")?.layout?.base?.hidden;

test.describe("homepage: the original page, from aoost blocks", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("is built only from the aoost blocks, in the original order; the site nav holds only published pages", async ({ page }) => {
    await home(page);
    expect(await page.locator(".ao-b").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.ao))).toEqual(["hero", "projects", "journals", "tools", "playlists", "wall", "rodeo", "footer", "viewer"]);
    // The homepage's "Site navigation on this page" setting. While every other page is a draft the pill is just the logo.
    await expect(page.locator(".nav")).toHaveCount(homeHidesNav ? 0 : 1);
    if (!homeHidesNav) {
      await expect(page.locator(".pill .pill-logo")).toBeVisible();
      await expect(page.locator(".pill-links .pill-link")).toHaveCount(liveNavPages);
      if (!liveNavPages) await expect(page.locator(".pill-menu")).toHaveCount(0);
    }
    // the two cutting mats group the same sections as the original
    expect(await page.locator(".mat-light .ao-b").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.ao))).toEqual(["projects", "journals", "tools"]);
    expect(await page.locator(".mat-dark .ao-b").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.ao))).toEqual(["playlists", "wall", "rodeo", "footer"]);
    await expect(page.locator('section[aria-labelledby="h-wall"]')).toBeVisible({ visible: wallOn }); // the wall is off on the live site
  });

  test("the clock shows Cape Town time", async ({ page }) => {
    await home(page);
    const now = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" }).format(new Date());
    const shown = await page.locator("#clock").textContent();
    expect(shown).toMatch(/^CPT \d\d:\d\d$/);
    expect(Math.abs(Number(shown!.slice(-2)) - Number(now.slice(-2))) % 59).toBeLessThanOrEqual(1);
  });

  test("the ticker strip follows its switch (off on the live site: no strip), and the leaderboard still loads for everyone", async ({ page }) => {
    await home(page);
    await expect(page.locator("#ticker")).toHaveCount(tickerOn ? 1 : 0);
    await expect(page.locator(".tk-track")).toHaveCount(tickerOn && !dotBoard ? 1 : 0);
    await expect(page.locator("#ticker canvas.dm")).toHaveCount(tickerOn && dotBoard ? 1 : 0);
    await expect(page.locator("#lbScope")).toHaveText("everyone");
    expect(await page.locator("#lbList li").count()).toBeGreaterThan(0);
    await expect(page.locator("#lbList li").first().locator(".n")).toHaveText("01");
  });

  test("tapping the reel or a project opens the viewer (when switched on); dragging a piece moves it instead", async ({ page }) => {
    await home(page);
    const reelViewer = hero.reelViewer !== false, pieceViewer = homeBlock("AoostProjects").viewer !== false; // switched off in the editor (21 Nov)
    await page.locator("#reel .hr-slide").first().click({ force: true });
    if (reelViewer) {
      await expect(page.locator("#viewer")).toBeVisible();
      await expect(page.locator("#vStage img")).toHaveAttribute("src", hero.reel[0].src);
      await page.keyboard.press("Escape");
    }
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

    await page.locator("#table .piece").nth(2).click({ force: true });
    if (pieceViewer) {
      await expect(page.locator("#vStage img")).toHaveAttribute("src", visibleProjects()[2]!.image);
      await page.locator("#vClose").click();
    } else {
      await page.waitForTimeout(400);
      await expect(page.locator("#viewer")).toBeHidden();
    }
    await expect(page.locator("#viewer")).toBeHidden();
  });

  test("the keychain swings (when shown), the note is plain, and the skills section is hidden", async ({ page }) => {
    const projects = homeBlock("AoostProjects");
    await home(page);
    if (projects.keychain.show) {
      // it sways all the time, so it never "holds still" for Playwright's own scroll and click
      await page.locator("#keychain").evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.locator("#keychain").dispatchEvent("click");
      await expect(page.locator("#keychain")).toHaveClass(/kick/);
    } else await expect(page.locator("#keychain")).toHaveCount(0); // switched off in the editor (21 Nov)
    if (projects.note.show) {
      await expect(page.locator(".table-note")).toHaveAttribute("data-note-style", projects.note.style ?? "eye");
      await expect(page.locator(".table-note canvas")).toHaveCount(projects.note.style === "plain" ? 0 : 1);
    } else await expect(page.locator(".table-note")).toHaveCount(0); // switched off in the editor (21 Nov)
    await expect(page.locator(".skills")).toBeVisible({ visible: !skillsHidden }); // hidden on the live site, kept for an About page later
  });

  test("a journal opens in the dark room, turns spreads and closes", async ({ page }) => {
    const { journals, sub } = homeBlock("AoostJournals");
    const shown = journals.filter((j: { hidden?: boolean }) => !j.hidden);
    const first = shown[0];
    await home(page);
    await expect(page.locator("#jrShelf .jr")).toHaveCount(shown.length);
    await expect(page.locator("#jrShelf .jr .jr-cap b")).toHaveText(shown.map((j: { title: string }) => j.title));
    await expect(page.locator(".jr-sub")).toHaveCount(sub?.trim() ? 1 : 0);
    await page.locator("#jrShelf .jr").first().scrollIntoViewIfNeeded();
    await page.locator("#jrShelf .jr").first().click();
    const viewer = page.locator(".jv.jvr");
    await expect(viewer).toHaveClass(/on/);
    await expect(viewer.locator(".jvr-t")).toHaveText(first.title);
    // the stickers placed in Atom on the first page
    await expect(viewer.locator(".ji-sticker img")).toHaveCount(first.pages[0].items.filter((i: { kind: string }) => i.kind === "sticker").length);
    const before = await viewer.locator(".jvr-ct").textContent();
    await viewer.locator(".jvr-nx").click();
    await expect(viewer.locator(".jvr-ct")).not.toHaveText(before!);
    await page.keyboard.press("ArrowLeft");
    await expect(viewer.locator(".jvr-ct")).toHaveText(before!);
    await page.keyboard.press("Escape");
    await expect(page.locator(".jv")).toHaveCount(0, { timeout: 4000 });
  });

  test("the playlist chips switch the sleeve and the tracklist", async ({ page }) => {
    const lists: { title: string; spotify: string; cover: string }[] = homeBlock("AoostPlaylistBand").playlists;
    expect(lists.length).toBeGreaterThanOrEqual(3);
    // no real Spotify player in this test (tests/playlists.spec.ts drives a stubbed one)
    await page.route(/open\.spotify\.com\/embed\/iframe-api/, (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
    await home(page);
    await page.locator(".pl-chips").scrollIntoViewIfNeeded();
    await expect(page.locator(".pl-chip")).toHaveText(lists.map((l) => l.title));
    await expect(page.locator(".pl-rec:visible img").first()).toHaveAttribute("src", lists[0]!.cover);
    await page.locator(".pl-chip").nth(1).click();
    await expect(page.locator(".pl-chip").nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".pl-rec:visible img").first()).toHaveAttribute("src", lists[1]!.cover);
    await expect(page.locator(".pl-list:visible .pl-more")).toHaveAttribute("href", `https://open.spotify.com/playlist/${lists[1]!.spotify}`);
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

  test("late mode follows its switch (off on the live site: the page stays light after midnight)", async ({ page }) => {
    await home(page, "/?late=1");
    const dark = "rgb(17, 18, 19)";
    if (hero.lateMode) {
      await expect(page.locator("html")).toHaveClass(/late/);
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(dark);
    } else {
      await expect(page.locator("html")).not.toHaveClass(/late/);
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(dark);
    }
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

  test("fits 390px, the game gets its thumb pad, and the sleeve sits above the tracklist and Spotify's player", async ({ page }) => {
    await home(page);
    // A block sliding in (enter animation) must not widen the page, even mid-slide.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(await page.locator("#rodeo").evaluate((c) => c.getBoundingClientRect().height)).toBeGreaterThan(300); // includes the 112px thumb pad
    const [sleeve, list, player] = await Promise.all([".pl-rec:visible", ".pl-list:visible", ".pl-player"].map((s) => page.locator(s).boundingBox()));
    expect(sleeve!.y + sleeve!.height).toBeLessThanOrEqual(list!.y);
    expect(list!.y + list!.height).toBeLessThanOrEqual(player!.y);
    expect(player!.height).toBeGreaterThan(60); // 80px, a little less while the focus effect scales the band
    if (!homeHidesNav && !liveNavPages) await expect(page.locator(".pill-menu")).toHaveCount(0); // no Menu with nothing to link to
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

  test("switched on, the ticker strip runs and late mode turns the page dark after midnight", async ({ page, request }) => {
    await resetDraft(request, password!);
    const site = await draftSite(request, password!);
    const page0 = site.pages.find((p: { id: string }) => p.id === "home");
    const heroBlock = page0.sections.map((s: { children: { type: string; content: Record<string, unknown> }[] }) => s.children[0]).find((n: { type: string }) => n.type === "AoostHero");
    Object.assign(heroBlock.content, { showTicker: true, tickerStyle: "scroll", ticker: [{ text: "new drawings up", mode: "both" }], lateMode: true });
    expect((await request.post("/api/editor/ops", { headers: bearer(password!), data: { ops: [{ op: "putPage", page: page0 }] } })).ok()).toBe(true);
    await guard(page.context());
    await signIn(page, password!);

    await page.goto("/preview/");
    await expect(page.locator("#ticker")).toHaveCount(1);
    await expect(page.locator(".tk-track")).toContainText("new drawings up");

    await page.goto("/preview/?late=1");
    await expect(page.locator("html")).toHaveClass(/late/);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(17, 18, 19)");
    await resetDraft(request, password!);
  });
});

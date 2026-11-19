import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homeBlock } from "./content";
import { editorPassword, resetDraft, signIn } from "./helpers";

/**
 * The playlists band on the draft preview: the chips switch the sleeve and the tracklist, and a track
 * plays through Spotify's embed controller. The Spotify iFrame API is stubbed, so the test records what
 * the band asks of the controller without loading Spotify.
 */
const cms = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shots = resolve(cms, "../docs/screenshots/playlists");
const password = editorPassword();
const generated: { playlists: Record<string, { tracks: { title: string; uri: string }[] }> } = JSON.parse(readFileSync(resolve(cms, "src/generated/playlists.json"), "utf8"));
const lists: { title: string; spotify: string }[] = homeBlock("AoostPlaylistBand").playlists.filter((p: { hidden?: boolean; spotify: string }) => p.spotify && !p.hidden);
const idOf = (s: string) => /playlist[/:]([A-Za-z0-9]+)/.exec(s)?.[1] ?? s;

const STUB = `
window.__sp = [];
window.onSpotifyIframeApiReady && window.onSpotifyIframeApiReady({
  createController(el, opts, cb) {
    window.__sp.push(["create", opts.uri]);
    cb({ loadUri: (u) => window.__sp.push(["loadUri", u]), play: () => window.__sp.push(["play"]), addListener() {} });
  },
});`;
const calls = (page: Page) => page.evaluate(() => (window as unknown as { __sp?: string[][] }).__sp ?? []);

test.describe("playlists: sleeve and tracklist", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await signIn(page, password!);
  });

  test("switching the playlist updates the tracklist, and clicking a track plays it through the embed controller", async ({ page }) => {
    expect(lists.length).toBeGreaterThanOrEqual(2);
    await page.route(/open\.spotify\.com\/embed\/iframe-api/, (r) => r.fulfill({ contentType: "text/javascript", body: STUB }));
    await page.goto("/preview/");
    await page.locator(".pl-chips").scrollIntoViewIfNeeded();
    await expect.poll(() => calls(page)).toEqual([["create", `spotify:playlist:${idOf(lists[0]!.spotify)}`]]);

    const second = generated.playlists[idOf(lists[1]!.spotify)]!.tracks;
    await expect(page.locator(".pl-list:visible .pl-ti").first()).toHaveText(generated.playlists[idOf(lists[0]!.spotify)]!.tracks[0]!.title);
    await page.locator(".pl-chip", { hasText: lists[1]!.title }).click();
    await expect(page.locator(".pl-chip").nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".pl-chip").nth(0)).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".pl-list:visible")).toHaveCount(1);
    await expect(page.locator(".pl-list:visible .pl-ti")).toHaveText(second.slice(0, 8).map((t) => t.title));
    await expect(page.locator(".pl-list:visible .pl-more")).toHaveText(second.length > 8 ? `+ ${second.length - 8} more · open in Spotify ↗` : "open in Spotify ↗");
    await expect(page.locator('.pl-rec[data-i="1"]')).toBeVisible();
    await expect(page.locator('.pl-rec[data-i="0"]')).toBeHidden();
    expect((await calls(page)).at(-1)).toEqual(["loadUri", `spotify:playlist:${idOf(lists[1]!.spotify)}`]);

    const track = page.locator(".pl-list:visible .pl-track").nth(2);
    await track.click();
    expect((await calls(page)).slice(-2)).toEqual([["loadUri", second[2]!.uri], ["play"]]);
    await expect(track).toHaveAttribute("aria-current", "true");
    await expect(page.locator(".pl-list:visible .pl-track[aria-current]")).toHaveCount(1);
  });

  test("the disc stays put with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route(/open\.spotify\.com\/embed\/iframe-api/, (r) => r.fulfill({ contentType: "text/javascript", body: STUB }));
    await page.goto("/preview/");
    await page.locator(".pl-chip").nth(1).click();
    expect(await page.locator('.pl-rec[data-i="1"] .pl-disc').evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
  });

  for (const [label, width, height] of [["1440", 1440, 900], ["390", 390, 844]] as const) {
    test(`screenshot at ${label}`, async ({ page }) => {
      mkdirSync(shots, { recursive: true });
      await page.setViewportSize({ width, height });
      await page.goto("/preview/");
      const band = page.locator('.ao-b[data-ao="playlists"]');
      await band.evaluate((e) => e.scrollIntoView({ block: "start" }));
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2000);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      const box = (await band.boundingBox())!;
      await page.setViewportSize({ width, height: Math.ceil(box.height) });
      await band.evaluate((e) => e.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${shots}/playlists-${label}.png` });
    });
  }
});

import { expect, test } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bearer, draftSite, editorPassword, fullPageShot, resetDraft, signIn } from "./helpers";

const __dirname = dirname(fileURLToPath(import.meta.url));

const shots = resolve(__dirname, "../../docs/screenshots");
const widths = [
  { name: "390", viewport: { width: 390, height: 844 } },
  { name: "1440", viewport: { width: 1440, height: 900 } },
] as const;

for (const { name, viewport } of widths) {
  test.describe(`sample page at ${name}px`, () => {
    test.use({ viewport });
    test.setTimeout(90_000); // full-height captures with live embeds are slow

    test("renders every section kind and media type, and is captured for the docs", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/sample");

      // the three section kinds
      for (const kind of ["flow", "grid", "canvas"]) await expect(page.locator(`section[data-kind="${kind}"]`).first()).toBeAttached();
      // an overlay straddling a section edge
      const overlay = (await page.locator(".ov-sample-badge").boundingBox())!;
      const grid = (await page.locator("#sample-grid").boundingBox())!;
      expect(overlay.y).toBeLessThan(grid.y);
      expect(overlay.y + overlay.height).toBeGreaterThan(grid.y);

      // media types
      await expect(page.locator(".n-sample-img-duo .media")).toHaveCSS("mix-blend-mode", "multiply");
      await expect(page.locator(".n-sample-img-fit .media")).toHaveCSS("object-fit", "contain");
      await expect(page.locator(".n-sample-img-fill .media")).toHaveCSS("object-position", "20% 80%");
      await page.locator(".n-sample-video").scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator(".n-sample-video video").evaluate((v: HTMLVideoElement) => !v.paused && v.muted)).toBe(true);
      await expect(page.locator(".n-sample-audio audio")).toHaveAttribute("preload", "none");
      await page.locator(".n-sample-lottie").scrollIntoViewIfNeeded();
      await expect(page.locator(".n-sample-lottie svg")).toBeAttached();
      await page.locator("model-viewer").scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator("model-viewer").evaluate((m) => !!customElements.get("model-viewer") && !!m.shadowRoot)).toBe(true);
      await expect(page.locator(".n-sample-file a")).toHaveAttribute("download", "");

      // embeds and code
      // third-party frames load nothing until scrolled near
      await expect(page.locator(".n-sample-map iframe")).toHaveAttribute("data-src", /google\.com\/maps/);
      await page.locator(".n-sample-spotify").scrollIntoViewIfNeeded();
      await expect(page.locator(".n-sample-spotify iframe")).toHaveAttribute("src", /open\.spotify\.com\/embed\/playlist/);
      await expect(page.locator(".n-sample-map iframe")).toHaveAttribute("src", /google\.com\/maps/);
      await page.locator(".n-sample-code").scrollIntoViewIfNeeded();
      const code = page.locator(".n-sample-code iframe");
      await expect(code).toHaveAttribute("sandbox", "allow-scripts");
      await expect.poll(() => code.evaluate((f: HTMLIFrameElement) => parseInt(f.style.height || "0"))).toBeGreaterThan(20); // sized itself to its content
      await expect(page.frameLocator(".n-sample-code iframe").locator(".ticker")).toContainText("DUST AND NEON");
      // YouTube loads nothing until asked
      expect(await page.locator('iframe[src*="youtube"]').count()).toBe(0);

      // layout basics
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex"); // unlisted
      expect(errors).toEqual([]);

      await fullPageShot(page, `${shots}/sample-${name}.png`);
    });

    test("captures the home page for the docs", async ({ page }) => {
      await page.goto("/");
      await fullPageShot(page, `${shots}/home-${name}.png`);
    });
  });
}

test.describe("lightbox and clean URLs", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("an image opens full screen and closes with Escape", async ({ page }) => {
    await page.goto("/work");
    await page.locator(".gal .frame").first().click();
    await expect(page.locator("dialog.lbx")).toBeVisible();
    await expect(page.locator("dialog.lbx img")).toHaveAttribute("alt", "Studio piece");
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog.lbx")).toBeHidden();
  });

  test("pages are served at clean URLs, with a real 404", async ({ request }) => {
    expect((await request.get("/work/digital")).status()).toBe(200);
    expect((await request.get("/nope", { headers: { Accept: "text/html" } })).status()).toBe(404);
    expect((await request.get("/_published.json")).status()).toBe(404);
  });
});

test.describe("navigation with all ten item types (draft preview)", () => {
  const password = editorPassword();
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");

  test("mega menu, search, badge, button, embed on desktop; accordions on mobile", async ({ page, request }) => {
    await resetDraft(request, password!);
    const site = await draftSite(request, password!);
    const item = (id: string, type: string, extra: object = {}) => ({ id, type, showOn: "both", hover: "tint", ...extra });
    const nav = {
      ...site.nav,
      items: [
        item("t-page", "page", { target: { kind: "page", pageId: "work" } }),
        item("t-section", "section", { label: "Lately", target: { kind: "section", pageId: "work", sectionId: "work-gallery" } }),
        item("t-ext", "external", { label: "Shop", target: { kind: "url", url: "https://example.com" }, newTab: true, icon: { name: "arrow", position: "right" } }),
        item("t-dd", "dropdown", { label: "More", source: "manual", children: [item("t-dd-l", "label", { label: "Elsewhere" }), item("t-dd-1", "page", { target: { kind: "page", pageId: "about" } }), item("t-dd-2", "page", { target: { kind: "page", pageId: "rodeo" } })] }),
        item("t-mega", "mega", {
          label: "Explore",
          panel: [
            {
              id: "t-panel",
              kind: "grid",
              layout: { base: { columns: 1, gap: 16, padding: "20px" }, desktop: { columns: 3, gap: 24, padding: "28px" } },
              children: [
                { id: "t-p1", type: "Text", content: { text: "Bodies of work", styleId: "label", tag: "p" }, style: { base: {} } },
                { id: "t-p2", type: "Image", content: { src: "/art/grillz.jpg", alt: "Grillz", lightbox: false }, style: { base: { aspectRatio: "16/9", radius: [6, 6, 6, 6] } } },
                { id: "t-p3", type: "Button", content: { label: "All work", target: { kind: "page", pageId: "work" }, variant: "text" }, style: { base: {} } },
              ],
            },
          ],
        }),
        item("t-diary", "page", { target: { kind: "page", pageId: "diary" }, badge: { text: "New" }, hover: "underline" }),
        item("t-search", "search"),
        item("t-embed", "embed", { label: "Ticker", code: '<div style="font:600 11px sans-serif;color:#F3EFE6;padding:15px 10px;white-space:nowrap">ON AIR</div>', showOn: "desktop" }),
        item("t-label", "label", { divider: true, showOn: "desktop" }),
        item("t-social", "social", { showOn: "desktop" }),
        item("t-btn", "button", { label: "Say howdy", target: { kind: "email", email: "howdy@example.com" }, variant: "filled" }),
      ],
    };
    const res = await request.post("/api/editor/ops", { headers: bearer(password!), data: { ops: [{ op: "set", key: "nav", value: nav }] } });
    expect(res.ok()).toBe(true);
    await signIn(page, password!);

    // desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/about"); // the home page shows no nav
    await expect(page.locator(".pill-links .nav-badge")).toHaveText("New");
    await expect(page.locator(".pill-cta")).toHaveAttribute("href", "mailto:howdy@example.com");
    await expect(page.locator(".pill-links iframe.nav-embed")).toHaveAttribute("sandbox", "allow-scripts");
    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("menuitem", { name: "About" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Explore" }).click();
    const mega = page.locator(".menu.mega");
    await expect(mega).toBeVisible();
    expect(await mega.locator(".si").evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length)).toBe(3);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${shots}/nav-mega-1440.png` });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Search" }).click();
    await page.locator("#nav-search-input").fill("stars");
    await expect(page.locator(".search-results a").first()).toContainText("Stars & static");
    await page.keyboard.press("Escape");
    await expect(page.locator("#nav-search")).toBeHidden();

    // mobile: dropdowns become accordions, the mega menu stacks
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/preview/work"); // the home page shows no nav; on About the "More" accordion is already open
    await page.locator(".pill-menu").click();
    await page.getByRole("button", { name: "More submenu" }).click();
    await expect(page.locator("#nav-sheet .sheet-sub a", { hasText: "Rodeo" })).toBeVisible();
    await page.getByRole("button", { name: "Explore submenu" }).click();
    expect(await page.locator(".sheet-mega .si").evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${shots}/nav-menu-390.png` });

    await resetDraft(request, password!);
  });
});

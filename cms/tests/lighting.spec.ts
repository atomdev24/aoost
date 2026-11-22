import { expect, test, type Page } from "@playwright/test";

/**
 * Lighting on the homepage (22 Nov 2026): the hero's matte screen is glass that stays still while
 * the artwork pans and drifts under it, and the Journals window light carries on exactly where the
 * Projects window shadow leaves off. Runs on the published homepage (it uses the matte screen and
 * the window shadow).
 */
const open = async (page: Page, width: number) => {
  await page.setViewportSize({ width, height: 900 });
  await page.route(/supabase\.co|jsdelivr/, (r) => r.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
};

for (const width of [1440, 1024, 390]) {
  test.describe(`lighting at ${width}`, () => {
    test("the matte screen stays put over the moving artwork, under the labels, and lets clicks through", async ({ page }) => {
      await open(page, width);
      const hero = page.locator("header.hero-rect");
      const screen = hero.locator(":scope > .hr-screen");
      await expect(screen.locator("i")).toHaveCount(3);
      expect(await screen.evaluate((el) => el.getAttribute("aria-hidden"))).toBe("true");
      // a direct child of the header: never inside the track or a slide, which move
      expect(await screen.evaluate((el) => el.parentElement!.matches("header.hero-rect"))).toBe(true);
      // the label row and the progress line come after it, so they paint above it
      expect(await hero.evaluate((h) => [...h.children].map((c) => c.className.split(" ")[0]))).toEqual(expect.arrayContaining(["hr-track", "hr-screen", "hr-top", "hr-bar"]));
      expect(await hero.evaluate((h) => { const k = [...h.children].map((c) => c.className.split(" ")[0]); return k.indexOf("hr-screen") > k.indexOf("hr-track") && k.indexOf("hr-screen") < k.indexOf("hr-top") && k.indexOf("hr-top") < k.indexOf("hr-bar"); })).toBe(true);
      // the glass covers the header exactly, before and after a scroll (parallax drift moves the track only)
      const same = async () => {
        const [h, s] = await Promise.all([hero.boundingBox(), screen.boundingBox()]);
        expect(Math.abs(h!.x - s!.x) + Math.abs(h!.y - s!.y) + Math.abs(h!.width - s!.width) + Math.abs(h!.height - s!.height)).toBeLessThan(1);
      };
      await same();
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(300);
      await same();
      // clicks go through to the slide
      const b = (await hero.boundingBox())!;
      expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest(".hr-slide"), [b.x + b.width / 2, b.y + b.height / 2])).toBe(true);
      // shade and glare are drawn across hero + ticker (one screen); the grain tile repeats at 1:1
      const tk = page.locator(".ticker");
      const heroH = await hero.evaluate((e) => (e as HTMLElement).offsetHeight), tkH = await tk.evaluate((e) => (e as HTMLElement).offsetHeight);
      const blends = await screen.locator("i").evaluateAll((els) => els.map((e) => { const c = getComputedStyle(e); return [c.mixBlendMode, c.opacity, c.backgroundSize]; }));
      const px = (v: string) => v.replace(/(\d+(\.\d+)?)px/g, (_, n) => `${Math.round(Number(n))}px`);
      expect(blends.map(([m, o, z]) => [m, o, px(z!)])).toEqual([
        ["multiply", "0.7", `100% calc(100% + ${tkH}px)`],
        ["screen", "1", `100% calc(100% + ${tkH}px)`],
        ["screen", "0.6", "256px 256px"],
      ]);
      // the ticker carries the same screen on, in the hero's dark tone, its part of the shade and glare lined up below the hero's
      await expect(tk).toHaveClass(/sc-joined/);
      expect(await tk.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(20, 21, 22)");
      const tkLayers = await tk.locator(".tk-screen i").evaluateAll((els) => els.map((e) => { const c = getComputedStyle(e); return [c.mixBlendMode, c.backgroundSize, c.backgroundPosition]; }));
      expect(tkLayers.map(([m, z, p]) => [m, px(z!), p])).toEqual([
        ["multiply", `100% calc(100% + ${heroH}px)`, "0px 100%"],
        ["screen", `100% calc(100% + ${heroH}px)`, "0px 100%"],
        ["screen", "256px 256px", "0px 0px"],
      ]);
    });

    test("the Journals window light starts where the Projects shadow image ends", async ({ page }) => {
      await open(page, width);
      const room = page.locator(".jr-light.jl-room");
      await expect(room).toHaveClass(/is-on/);
      await page.locator(".jr").first().scrollIntoViewIfNeeded();
      const measure = () => page.evaluate(() => {
        const sh = document.querySelector<HTMLElement>(".board-shadow")!;
        const css = getComputedStyle(sh);
        const r = sh.getBoundingClientRect();
        const s = parseFloat(css.getPropertyValue("--sh-s")) || 110, fy = (parseFloat(css.getPropertyValue("--sh-y")) || 40) / 100, fx = (parseFloat(css.getPropertyValue("--sh-x")) || 50) / 100;
        const W = Math.max((s / 100) * r.width, r.height);
        // the Projects picture is square (3000×3000)
        const projBottom = r.top + scrollY + (r.height - W) * fy + W;
        const projLeft = r.left + (r.width - W) * fx;
        const shade = document.querySelector<HTMLElement>(".jl-room .jl-shade")!;
        const box = shade.getBoundingClientRect();
        const [size, pos] = [getComputedStyle(shade).backgroundSize, getComputedStyle(shade).backgroundPosition];
        const strip = pos.split(",")[1]!.trim().split(" ").map(parseFloat);
        const stripW = parseFloat(size.split(",")[1]!.trim());
        return {
          W,
          stripW,
          stripTop: box.top + scrollY + strip[1]!,
          stripLeft: box.left + strip[0]!,
          projBottom,
          projLeft,
          masked: getComputedStyle(sh).maskImage,
          books: (() => { const j = document.querySelector(".jr")!.getBoundingClientRect(); return !!document.elementFromPoint(j.left + j.width / 2, j.top + j.height / 2)?.closest(".jr"); })(),
        };
      });
      // the light is placed again whenever the layout settles (pictures loading move things), so wait for that
      await expect.poll(async () => { const m = await measure(); return Math.round(Math.abs(m.stripTop - m.projBottom) + Math.abs(m.stripLeft - m.projLeft)); }, { timeout: 8000 }).toBeLessThan(3);
      const g = await measure();
      expect(Math.abs(g.stripW - g.W)).toBeLessThan(2); // the same width as the Projects picture
      expect(Math.abs(g.stripTop - g.projBottom)).toBeLessThan(2); // starts right where it ends
      expect(Math.abs(g.stripLeft - g.projLeft)).toBeLessThan(2); // and lines up across
      expect(g.masked).toBe("none"); // the Projects shadow no longer fades out: the light carries on
      expect(g.books).toBe(true); // the journals stay on top
    });
  });
}

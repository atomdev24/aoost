// Screenshot pages at phone and desktop widths.
//   node scripts/shots.mjs <baseUrl> <outDir> <path>[=name] ...
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [base, outDir, ...paths] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const [label, width, height] of [["390", 390, 844], ["1440", 1440, 900]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: label === "390" ? 2 : 1 });
  page.on("console", (m) => m.type() === "error" && console.log(`[console ${label}]`, m.text()));
  page.on("pageerror", (e) => console.log(`[pageerror ${label}]`, e.message));
  for (const entry of paths) {
    const [path, name = path.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home"] = entry.split("=");
    await page.goto(base + path, { waitUntil: "networkidle" });
    // A full-page capture never scrolls, so wake everything that waits for the viewport:
    // lazy images and frames, enter animations, play-in-view video.
    await page.evaluate(async () => {
      document.querySelectorAll("[loading=lazy]").forEach((el) => (el.loading = "eager"));
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 1500));
    });
    await page.waitForLoadState("networkidle").catch(() => {});
    // Embedded frames only paint inside the viewport, so make the viewport as tall as the page.
    const full = Math.min(16000, await page.evaluate(() => document.documentElement.scrollHeight));
    await page.setViewportSize({ width, height: full });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/${name}-${label}.png` });
    await page.setViewportSize({ width, height });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.log(`[overflow ${label}] ${path}: ${overflow}px wider than the viewport`);
  }
  await page.close();
}
await browser.close();

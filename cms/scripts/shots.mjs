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
    // Let lazy images and enter animations settle before the full-page capture.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });
    await page.screenshot({ path: `${outDir}/${name}-${label}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.log(`[overflow ${label}] ${path}: ${overflow}px wider than the viewport`);
  }
  await page.close();
}
await browser.close();

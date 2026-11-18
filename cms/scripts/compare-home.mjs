// Side-by-side screenshots of the original homepage (repo-root index.html) and the CMS homepage.
//   node scripts/compare-home.mjs [cmsBaseUrl] [cmsPath]   defaults http://localhost:8787 and /
// A cmsPath under /preview/ captures the editor's draft; it signs in with EDITOR_PASSWORD from the environment.
// Writes docs/screenshots/homepage-compare/{original,cms}-{390,1440}.png
//
// The original page talks to Alex's Supabase project. These captures must not change anything there:
// reads (content, leaderboard) are allowed; writes (visit counter, scores) and live presence are blocked.
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = resolve(repo, "docs/screenshots/homepage-compare");
const cms = process.argv[2] ?? "http://localhost:8787";
const cmsPath = process.argv[3] ?? "/";
mkdirSync(out, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(repo, path === "/" ? "index.html" : path);
  if (!file.startsWith(repo) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((r) => server.listen(8799, r));

export async function guard(context) {
  await context.route(/supabase\.co/, (route) => {
    const req = route.request();
    const url = req.url();
    const read = req.method() === "GET" || (req.method() === "POST" && url.includes("/rpc/site_content")) || url.includes("/storage/");
    return read && !url.includes("/visits") ? route.continue() : route.abort();
  });
  await context.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (route) => route.abort());
}

const browser = await chromium.launch();
for (const [label, width, height] of [["390", 390, 844], ["1440", 1440, 900]]) {
  for (const [name, url] of [["original", "http://localhost:8799/"], ["cms", cms + cmsPath]]) {
    // Reduced motion makes both pages deterministic: no focus blur, no auto-advancing reel, no moving ticker.
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    await guard(context);
    if (name === "cms" && cmsPath.startsWith("/preview")) {
      const login = await context.request.post(cms + "/api/login", { data: { password: process.env.EDITOR_PASSWORD ?? "" } });
      if (!login.ok()) throw new Error(`could not sign in to the editor for the draft preview: ${login.status()}`);
    }
    const page = await context.newPage();
    page.on("pageerror", (e) => console.log(`[${name} ${label}] pageerror:`, e.message.slice(0, 200)));
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
    } catch (e) {
      console.log(`[${name} ${label}] could not load ${url}: ${e.message.split("\n")[0]}`);
      await context.close();
      continue;
    }
    await page.waitForTimeout(3500); // content loader, images, fonts, the Spotify lookups
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: `${out}/${name}-${label}.png`, fullPage: true });
    console.log(`${name}-${label}.png  ${width}×${full}`);
    await context.close();
  }
}
await browser.close();
server.close();

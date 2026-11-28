// Nightly look at the live site: screenshots at phone and desktop widths, compared with last night's.
//   node scripts/live-look.mjs <baseUrl> <outDir> [prevDir]
// Pages come from LOOK_PATHS (comma-separated), else <baseUrl>/sitemap.xml, else the homepage. For each page and width it writes
// <outDir>/<name>-<width>.png and, when last night's capture exists, <outDir>/diff-<name>-<width>.png
// (changes in pink over a faded copy). <outDir>/summary.md lists what changed, for the run's summary.
//
// A look must never change anything: writes to Supabase (the rodeo leaderboard and visit counter) are
// blocked, and so are visitor-stats beacons (Clarity, Cloudflare), so the nightly visit isn't counted.
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [base, outDir, prevDir] = process.argv.slice(2);
if (!base || !outDir) throw new Error("usage: live-look.mjs <baseUrl> <outDir> [prevDir]");
mkdirSync(outDir, { recursive: true });

const THRESHOLD = 40; // per-channel difference (0-255) that counts as a visible change
const WIDTHS = [["390", 390, 844, 2], ["1440", 1440, 900, 1]];
const MAX_PAGES = 20;

async function pagesFromSitemap() {
  if (process.env.LOOK_PATHS) return process.env.LOOK_PATHS.split(",").map((p) => p.trim()).filter(Boolean).slice(0, MAX_PAGES);
  try {
    const res = await fetch(new URL("/sitemap.xml", base));
    if (!res.ok) return ["/"];
    const urls = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    return [...new Set(["/", ...urls])].slice(0, MAX_PAGES);
  } catch {
    return ["/"];
  }
}

const nameOf = (path) => path.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home";

async function diff(a, b, out) {
  const [x, y] = await Promise.all([a, b].map((f) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
    return { note: `size changed (${x.info.width}×${x.info.height} → ${y.info.width}×${y.info.height})`, share: 1 };
  }
  const { width: W, height: H } = y.info;
  const img = Buffer.alloc(W * H * 3);
  let changed = 0;
  for (let i = 0; i < W * H * 3; i += 3) {
    const d = Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]));
    if (d > THRESHOLD) {
      changed++;
      img[i] = 255; img[i + 1] = 0; img[i + 2] = 140;
    } else {
      const g = 200 + Math.round(y.data[i] / 5);
      img[i] = img[i + 1] = img[i + 2] = Math.min(255, g);
    }
  }
  const share = changed / (W * H);
  if (changed) await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
  return { note: changed ? `${(share * 100).toFixed(2)}% of the page changed` : "no change", share };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const paths = await pagesFromSitemap();
const rows = [];
const problems = [];
for (const [label, width, height, scale] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, serviceWorkers: "block" });
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const url = req.url();
    if (/supabase\.co/.test(url) && req.method() !== "GET") return route.abort();
    if (/supabase\.co\/realtime|clarity\.ms|cloudflareinsights\.com|\/cdn-cgi\/rum/.test(url)) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${label}px: page error: ${e.message}`));
  for (const path of paths) {
    const name = nameOf(path);
    const file = join(outDir, `${name}-${label}.png`);
    try {
      const res = await page.goto(new URL(path, base).toString(), { waitUntil: "networkidle", timeout: 45_000 });
      if (!res || res.status() >= 400) problems.push(`${path} at ${label}px answered ${res?.status() ?? "nothing"}`);
      await page.evaluate(async () => {
        document.querySelectorAll("[loading=lazy]").forEach((el) => (el.loading = "eager"));
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
      const prev = prevDir && join(prevDir, `${name}-${label}.png`);
      const result = prev && existsSync(prev) ? await diff(prev, file, join(outDir, `diff-${name}-${label}.png`)) : { note: "first capture", share: 0 };
      rows.push({ path, label, ...result });
    } catch (e) {
      problems.push(`${path} at ${label}px could not be captured: ${e.message.split("\n")[0]}`);
    }
  }
  await ctx.close();
}
await browser.close();

const changed = rows.filter((r) => r.share > 0.005);
const lines = [
  "## Live site look",
  "",
  changed.length ? `**${changed.length} capture(s) changed since last night.** Diff images (pink = changed) are in the run's artifacts.` : "Nothing visibly changed since last night.",
  "",
  "| Page | Width | Result |",
  "|---|---|---|",
  ...rows.map((r) => `| ${r.path} | ${r.label}px | ${r.note} |`),
];
if (problems.length) lines.push("", "### Problems", "", ...problems.map((p) => `- ${p}`));
writeFileSync(join(outDir, "summary.md"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
if (problems.some((p) => /answered|could not/.test(p))) process.exitCode = 1;

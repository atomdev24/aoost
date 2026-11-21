// Stills on the board: do they appear, cover every frame while zooming, hand back to live, and match the live page?
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const port = process.argv[2] ?? "8799", label = process.argv[3] ?? "stills";
const pw = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../../.dev.vars", import.meta.url), "utf8"))[1].trim();
const out = new URL(`../../.probe-out/${label}/`, import.meta.url).pathname; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await b.newContext({ viewport: { width: 1600, height: 869 }, deviceScaleFactor: 1.8, baseURL: `http://localhost:${port}`, serviceWorkers: "block" });
await ctx.request.post("/api/login", { data: { password: pw } });
const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(String(e)));
await p.goto("/admin/?page=home");
await p.evaluate(() => localStorage.setItem("aoost.board.home", JSON.stringify({ view: { x: 120, y: 120, zoom: 0.3 }, hidden: { mobile: false, tablet: false, desktop: false, widescreen: false }, positions: {} })));
await p.reload();
await p.waitForSelector(".bd-frame-active iframe", { timeout: 30000 });
const t0 = Date.now();
await p.waitForFunction(() => document.querySelectorAll(".bd-still").length >= 3, null, { timeout: 30000 });
const firstStills = Date.now() - t0;
await p.waitForTimeout(1500);
const state = () => p.evaluate(() => [...document.querySelectorAll(".bd-frame")].map((f) => `${f.dataset.bp}${f.classList.contains("bd-frame-active") ? "*" : ""}:${f.classList.contains("is-still") ? "still" : "live"}`).join(" "));
const settled1 = await state();
await p.screenshot({ path: out + "settled.png" });
// match: for each inactive frame, screenshot with the still, then with it hidden (live), compare
const frames = await p.evaluate(() => [...document.querySelectorAll(".bd-frame")].filter((f) => f.classList.contains("is-still")).map((f) => { const r = f.getBoundingClientRect(); return [f.dataset.bp, Math.max(0, r.x), Math.max(0, r.y), Math.min(r.width, innerWidth - r.x), Math.min(r.height, innerHeight - r.y)]; }));
const withStill = await p.screenshot();
await p.addStyleTag({ content: ".bd-still{display:none!important}.bd-frame.is-still>iframe,.bd-frame.is-still .bd-live{visibility:visible!important}" });
await p.waitForTimeout(800);
const live = await p.screenshot();
const meta = await sharp(live).metadata(); const S = meta.width / 1600;
const match = {};
for (const [bp, x, y, w, h] of frames) {
  const box = { left: Math.round(x * S) + 2, top: Math.round(y * S) + 2, width: Math.max(10, Math.round(w * S) - 4), height: Math.max(10, Math.round(h * S) - 4) };
  const a = await sharp(withStill).extract(box).greyscale().resize(120, Math.round(120 * box.height / box.width), { fit: "fill" }).raw().toBuffer();
  const c = await sharp(live).extract(box).greyscale().resize(120, Math.round(120 * box.height / box.width), { fit: "fill" }).raw().toBuffer();
  let d = 0, big = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i] - c[i]); d += v; if (v > 40) big++; }
  match[bp] = { meanDiff: +(d / a.length).toFixed(2), pctBig: +(100 * big / a.length).toFixed(2) };
  await sharp({ create: { width: box.width * 2 + 10, height: box.height, channels: 3, background: "#000" } }).composite([{ input: await sharp(withStill).extract(box).toBuffer(), left: 0, top: 0 }, { input: await sharp(live).extract(box).toBuffer(), left: box.width + 10, top: 0 }]).jpeg({ quality: 70 }).toFile(`${out}match-${bp}.jpg`);
}
await p.reload(); await p.waitForSelector(".bd-frame-active iframe"); await p.waitForFunction(() => document.querySelectorAll(".bd-still").length >= 3, null, { timeout: 30000 }); await p.waitForTimeout(800);
// while zooming: every frame still?
const bd = await p.locator(".bd").boundingBox();
await p.mouse.move(bd.x + bd.width * 0.4, bd.y + bd.height * 0.45);
await p.keyboard.down("Control");
const during = [];
for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, i < 20 ? -8 : 8); if (i % 8 === 4) during.push(await state()); }
await p.keyboard.up("Control");
await p.waitForTimeout(900);
const after = await state();
writeFileSync(out + "result.json", JSON.stringify({ firstStills, settled1, during, after, match, errors }, null, 1));
console.log(JSON.stringify({ firstStillsMs: firstStills, settled: settled1, during: during[1], after, match, errors: errors.slice(0, 3) }));
await b.close();

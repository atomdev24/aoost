// Zoom like a trackpad pinch with a block selected (inspector open) and the Layers panel open.
// Records every frame, long animation frames, and how often each panel region is missing.
// Usage: node .probe/zoom.mjs <port> <label> [css]
import { chromium, webkit } from "playwright";
const WK = process.env.BROWSER === "webkit";
const NOSHOTS = process.env.NOSHOTS === "1";
const DSF = +(process.env.DSF ?? 2);
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const port = process.argv[2] ?? "8794";
const label = process.argv[3] ?? "zoom";
const inject = process.argv[4] ?? "";
const pw = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../../.dev.vars", import.meta.url), "utf8"))[1].trim();
const out = new URL(`../../.probe-out/${label}/`, import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const b = WK ? await webkit.launch({ headless: false }) : await chromium.launch({ channel: "chrome", headless: false });
const ctx = await b.newContext({ viewport: { width: 1512, height: 900 }, deviceScaleFactor: DSF, baseURL: `http://localhost:${port}`, serviceWorkers: "block" });
await ctx.request.post("/api/login", { data: { password: pw } });
const p = await ctx.newPage();
await p.goto("/admin/?page=home");
await p.waitForSelector(".bd-frame-active iframe", { timeout: 30000 });
await p.waitForFunction(() => !document.querySelector(".bd-loading-chip"), null, { timeout: 30000 }).catch(() => {});
if (inject) await p.addStyleTag({ content: inject });
await p.waitForTimeout(1200);
await p.frameLocator(".bd-frame-active iframe").locator("h2").first().click({ timeout: 8000 }).catch(() => {});
await p.waitForTimeout(300);
await p.keyboard.press("l"); // Layers panel
await p.waitForTimeout(600);
// where the panels are (screen px)
const regions = await p.evaluate(() => {
  const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [b.x + 6, b.y + 6, Math.min(b.width - 12, 260), Math.min(b.height - 12, 160)] : null; };
  return { top: r(".ed-island"), rail: r(".ed-rail"), flyout: r(".ed-flyout"), inspector: r(".ed-inspector"), zoom: r(".bd-zoombar"), label: r(".bd-label-wrap") };
});
await p.screenshot({ path: out + "start.png" });
await p.evaluate(() => {
  window.__ft = []; let l = performance.now();
  const k = (x) => { window.__ft.push(x - l); l = x; window.__r = requestAnimationFrame(k); }; window.__r = requestAnimationFrame(k);
  window.__loaf = [];
  try { new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__loaf.push({ d: Math.round(e.duration), style: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0) }))).observe({ type: "long-animation-frame", buffered: false }); } catch {}
});
const box = await p.locator(".bd").boundingBox();
await p.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
const shots = [];
let cdp = null, grabbing = true, grab = null;
if (!WK) {
  cdp = await ctx.newCDPSession(p);
  cdp.on("Page.screencastFrame", async (f) => { shots.push(f.data); await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 70, everyNthFrame: 1 });
} else if (!NOSHOTS) {
  grab = (async () => { while (grabbing) { const buf = await p.screenshot({ type: "jpeg", quality: 70 }).catch(() => null); if (buf) shots.push(buf.toString("base64")); } })();
}
await p.keyboard.down("Control");
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < 70; i++) { await p.mouse.wheel(0, -4); await p.waitForTimeout(10); }
  for (let i = 0; i < 70; i++) { await p.mouse.wheel(0, 4); await p.waitForTimeout(10); }
}
await p.keyboard.up("Control");
await p.waitForTimeout(400);
if (cdp) await cdp.send("Page.stopScreencast"); else { grabbing = false; if (grab) await grab; }
const perf = await p.evaluate(() => { cancelAnimationFrame(window.__r); const ft = window.__ft.slice(3); const s = [...ft].sort((a, b) => a - b); return { frames: ft.length, p95: Math.round(s[Math.floor(s.length * 0.95)]), worst: Math.round(s[s.length - 1]), over34: ft.filter((x) => x > 34).length, loaf: window.__loaf.length, loafWorst: Math.max(0, ...window.__loaf.map((x) => x.d)) }; });
// analyse frames: missing panels (flat region) and page flashes (frame differs from both neighbours)
const S = DSF, W = Math.round(1512 * S), H = Math.round(900 * S);
const stats = [];
const small = [];
for (let i = 0; i < shots.length; i++) {
  const buf = Buffer.from(shots[i], "base64");
  writeFileSync(`${out}z-${String(i).padStart(3, "0")}.jpg`, buf);
  const row = {};
  for (const [k, r] of Object.entries(regions)) {
    if (!r) continue;
    const [x, y, w, h] = r.map((v) => Math.round(v * S));
    const crop = await sharp(buf).extract({ left: x, top: y, width: Math.min(w, W - x), height: Math.min(h, H - y) }).toBuffer();
    row[k] = Math.round((await sharp(crop).stats()).channels[0].stdev);
  }
  stats.push(row);
  small.push(await sharp(buf).resize(189, 112).greyscale().raw().toBuffer());
}
const keys = Object.keys(regions).filter((k) => regions[k]);
const med = Object.fromEntries(keys.map((k) => { const v = stats.map((r) => r[k]).sort((a, b) => a - b); return [k, v[v.length >> 1]]; }));
const missing = {};
stats.forEach((r, i) => keys.forEach((k) => { if (r[k] < med[k] * 0.35) (missing[k] ??= []).push(i); }));
// flash = frame i far from the mean of its neighbours while the neighbours are close to each other
const flashes = [];
for (let i = 1; i < small.length - 1; i++) {
  let dPrevNext = 0, dMid = 0;
  for (let j = 0; j < small[i].length; j++) { const a = small[i - 1][j], c = small[i + 1][j], m = (a + c) / 2; dPrevNext += Math.abs(a - c); dMid += Math.abs(small[i][j] - m); }
  const n = small[i].length;
  if (dMid / n > 6 && dMid > dPrevNext * 0.9) flashes.push({ i, mid: +(dMid / n).toFixed(1), across: +(dPrevNext / n).toFixed(1) });
}
writeFileSync(out + "analysis.json", JSON.stringify({ regions, med, missing, flashes, perf }, null, 1));
console.log(JSON.stringify({ label, shots: shots.length, perf, panelsMissing: Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, v.length])), flashes: flashes.length, flashSample: flashes.slice(0, 6) }));
await b.close();

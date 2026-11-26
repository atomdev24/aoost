import { chromium } from "playwright";
const B = "http://localhost:8790";
const mobile = process.argv[2] === "mobile";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true } : { viewport: { width: 1440, height: 900 } });
const P = await ctx.newPage();
const cdp = await ctx.newCDPSession(P);
await cdp.send("Network.enable");
if (mobile) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
let bytes = 0; cdp.on("Network.loadingFinished", (e) => (bytes += e.encodedDataLength));
await P.addInitScript(() => {
  window.__ev = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ev.push({ n: e.name, d: Math.round(e.duration) }); }).observe({ type: "event", durationThreshold: 16, buffered: true });
  window.__loaf = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf = Math.max(window.__loaf, Math.round(e.duration)); }).observe({ type: "long-animation-frame", buffered: true }); } catch {}
});
const t0 = Date.now();
await P.goto(B + "/demo/", { waitUntil: "domcontentloaded" });
const tDom = Date.now() - t0;
// canvas ready = a section rendered inside the Puck iframe
await P.waitForFunction(() => [...document.querySelectorAll("iframe")].some((f) => f.contentDocument?.querySelector("section, [data-section]")), null, { timeout: 60000, polling: 50 });
const tCanvas = Date.now() - t0;
await P.waitForTimeout(2500);
const firstBytes = bytes;
await P.evaluate(() => document.getElementById("ed-load-banner")?.remove());
const frame = P.frames().find((f) => f !== P.mainFrame() && f.url() !== "about:blank") ?? P.frames()[1];
// select blocks repeatedly
const els = await P.evaluate(() => { const f = [...document.querySelectorAll("iframe")].find((f) => f.contentDocument?.querySelector("[data-puck-component]")); const r = f.getBoundingClientRect(); return [...f.contentDocument.querySelectorAll("[data-puck-component]")].slice(0, 8).map((e) => { const b = e.getBoundingClientRect(); const s = r.width / f.contentDocument.documentElement.clientWidth || 1; return { x: r.x + (b.x + Math.min(b.width, 40) / 2) * s, y: r.y + (b.y + Math.min(b.height, 20) / 2) * s }; }).filter((p) => p.y > 60 && p.y < 800); });
const sel = [];
for (const p of els) { const t = Date.now(); await P.mouse.click(p.x, p.y); await P.waitForTimeout(400); sel.push(Date.now() - t - 400); }
await P.evaluate(() => (window.__ev = []));
// typing into the first text input in the inspector
const inp = P.locator(".ed-inspector textarea, .ed-inspector input[type=text]").first();
let typed = "n/a";
if (await inp.count()) { await inp.click(); const t = Date.now(); await P.keyboard.type(" quick check of typing speed", { delay: 30 }); typed = Date.now() - t; }
await P.waitForTimeout(800);
const ev = await P.evaluate(() => window.__ev);
const loaf = await P.evaluate(() => window.__loaf);
const keys = ev.filter((e) => /key|input/.test(e.n)).map((e) => e.d);
const clicks = ev.filter((e) => /click|pointer/.test(e.n)).map((e) => e.d);
const q = (a) => (a.length ? { n: a.length, max: Math.max(...a), p50: a.sort((x, y) => x - y)[Math.floor(a.length / 2)] } : "none over 16ms");
console.log(JSON.stringify({ mobile, domMs: tDom, canvasReadyMs: tCanvas, transferKB: Math.round(firstBytes / 1024), selectedBlocks: els.length, typedMs: typed, slowKeyEvents: q(keys), slowClickEvents: q(clicks), longestFrameMs: loaf }, null, 1));
await b.close();

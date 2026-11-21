// Hold the board still after zooming 100% → 17% and hover a frame: do pieces of the page previews come and go?
// Usage: DSF=1.8 node .probe/tiles.mjs <port> <label> [css]
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const port = process.argv[2] ?? "8799", label = process.argv[3] ?? "tiles", inject = process.argv[4] ?? "";
const DSF = +(process.env.DSF ?? 1.8);
const pw = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../../.dev.vars", import.meta.url), "utf8"))[1].trim();
const out = new URL(`../../.probe-out/${label}/`, import.meta.url).pathname; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await b.newContext({ viewport: { width: 1600, height: 869 }, deviceScaleFactor: DSF, baseURL: `http://localhost:${port}`, serviceWorkers: "block" });
await ctx.request.post("/api/login", { data: { password: pw } });
const p = await ctx.newPage();
await p.goto("/admin/?page=home");
await p.evaluate(() => localStorage.setItem("aoost.board.home", JSON.stringify({ view: { x: 100, y: 120, zoom: 0.17 }, hidden: { mobile: false, tablet: false, desktop: false, widescreen: false }, positions: {} })));
await p.reload();
await p.waitForSelector(".bd-frame-active iframe", { timeout: 30000 });
await p.waitForFunction(() => !document.querySelector(".bd-loading-chip"), null, { timeout: 30000 }).catch(() => {});
if (inject) await p.addStyleTag({ content: inject });
if (process.env.WAITSTILLS) await p.waitForFunction(() => document.querySelectorAll(".bd-still").length >= 3, null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(1500);
const bd = (await p.locator(".bd").boundingBox());
const cx = bd.x + bd.width * 0.4, cy = bd.y + bd.height * 0.45;
await p.mouse.move(cx, cy);
const zoomPct = async () => parseInt((await p.locator(".bd-zoombar").innerText()).match(/(\d+)%/)?.[1] ?? "0");
// zoom in to ~100%, then out to ~17%, like a person would
await p.keyboard.down("Control");
for (let i = 0; i < 200 && (await zoomPct()) < 100; i++) { await p.mouse.wheel(0, -8); await p.waitForTimeout(8); }
await p.waitForTimeout(400);
for (let i = 0; i < 300 && (await zoomPct()) > 17; i++) { await p.mouse.wheel(0, 8); await p.waitForTimeout(8); }
await p.keyboard.up("Control");
await p.waitForTimeout(800);
const z = await zoomPct();
// frames' rectangles (screen px)
const rects = await p.evaluate(() => [...document.querySelectorAll(".bd-frame")].map((f) => { const r = f.getBoundingClientRect(); return [f.getAttribute("data-bp"), r.x, r.y, r.width, r.height]; }));
// record while still, hovering around the active frame
const cdp = await ctx.newCDPSession(p); const shots = [];
cdp.on("Page.screencastFrame", async (f) => { shots.push(f.data); await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
const act = rects.find((r) => r[0] === "desktop") ?? rects[0];
for (let i = 0; i < 60; i++) { await p.mouse.move(act[1] + act[3] * (0.2 + 0.6 * Math.random()), act[2] + act[4] * (0.2 + 0.7 * Math.random()), { steps: 3 }); await p.waitForTimeout(60); }
await cdp.send("Page.stopScreencast");
// compare each frame region against the final settled frame: count frames where a region differs a lot
const last = Buffer.from(shots[shots.length - 1], "base64");
const meta = await sharp(last).metadata(); const S = meta.width / 1600;
const res = {};
for (const [bp, x, y, w, h] of rects) {
  const box = { left: Math.max(0, Math.round(x * S) + 4), top: Math.max(0, Math.round(y * S) + 4), width: Math.round(w * S) - 8, height: Math.min(Math.round(h * S) - 8, meta.height - Math.round(y * S) - 8) };
  if (box.width < 20 || box.height < 20) continue;
  const ref = await sharp(last).extract(box).greyscale().resize(64, 64, { fit: "fill" }).raw().toBuffer();
  let bad = 0, worst = 0;
  for (let i = 0; i < shots.length - 1; i++) {
    const cur = await sharp(Buffer.from(shots[i], "base64")).extract(box).greyscale().resize(64, 64, { fit: "fill" }).raw().toBuffer();
    let d = 0, big = 0; for (let j = 0; j < cur.length; j++) { const v = Math.abs(cur[j] - ref[j]); d += v; if (v > 60) big++; }
    worst = Math.max(worst, big); if (big > 40) { bad++; if (bad <= 3) writeFileSync(`${out}${bp}-${i}.png`, Buffer.from(shots[i], "base64")); }
  }
  res[bp] = { badFrames: bad, of: shots.length - 1, worstBlockPixels: worst };
}
writeFileSync(`${out}last.png`, last);
console.log(JSON.stringify({ label, zoom: z, dsf: DSF, res }));
await b.close();

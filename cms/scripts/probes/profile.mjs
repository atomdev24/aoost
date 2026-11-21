// CPU-profile one action in real Chrome; top self-time by source (via the build's source maps).
import { chromium } from "playwright";
import { readFileSync, readdirSync } from "node:fs";
import { SourceMapConsumer } from "source-map-js";
const port = process.argv[2] ?? "8799", what = process.argv[3] ?? "zoom", dist = process.argv[4];
const pw = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../../.dev.vars", import.meta.url), "utf8"))[1].trim();
const b = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await b.newContext({ viewport: { width: 1600, height: 869 }, deviceScaleFactor: 1.8, baseURL: `http://localhost:${port}`, serviceWorkers: "block" });
await ctx.request.post("/api/login", { data: { password: pw } });
const p = await ctx.newPage();
await p.goto("/admin/?page=home");
await p.evaluate(() => localStorage.setItem("aoost.board.home", JSON.stringify({ view: { x: 120, y: 120, zoom: 0.3 }, hidden: { mobile: false, tablet: false, desktop: false, widescreen: false }, positions: {} })));
await p.reload(); await p.waitForSelector(".bd-frame-active iframe");
await p.waitForFunction(() => document.querySelectorAll(".bd-still").length >= 3, null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(2500);
const cdp = await ctx.newCDPSession(p);
await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 200 }); await cdp.send("Profiler.start");
const frame = p.frameLocator(".bd-frame-active iframe");
if (what === "zoom") { const bd = await p.locator(".bd").boundingBox(); await p.mouse.move(bd.x + bd.width * 0.45, bd.y + bd.height * 0.45); await p.keyboard.down("Control"); for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, i < 30 ? -10 : 10); await p.waitForTimeout(8); } await p.keyboard.up("Control"); await p.waitForTimeout(800); }
if (what === "type") { await frame.locator("h2").first().click(); await p.waitForTimeout(500); const input = p.locator(".ed-inspector input[type=text], .ed-inspector textarea").first(); await input.click(); await input.press("End"); await input.pressSequentially(" stress test typing", { delay: 35 }); await p.waitForTimeout(1500); }
if (what === "bp") { for (const n of ["Mobile", "Tablet", "Desktop"]) { await p.locator(".ed-island-bps").getByRole("button", { name: n, exact: true }).click(); await p.waitForTimeout(700); } }
const { profile } = await cdp.send("Profiler.stop");
// self time per node
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map(); const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (dt[i] ?? 0)));
const maps = new Map();
const consumer = (url) => {
  const file = url.split("/").pop();
  if (!maps.has(file)) { try { maps.set(file, new SourceMapConsumer(JSON.parse(readFileSync(`${dist}/${file}.map`, "utf8")))); } catch { maps.set(file, null); } }
  return maps.get(file);
};
const agg = new Map();
for (const [id, us] of self) {
  const n = byId.get(id); const cf = n.callFrame; let key = `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}`;
  if (cf.url.includes("/assets/")) { const c = consumer(cf.url); if (c) { const o = c.originalPositionFor({ line: cf.lineNumber + 1, column: cf.columnNumber }); if (o.source) key = `${o.name || cf.functionName || "(anon)"} ${o.source.replace(/^.*node_modules\//, "nm/").replace(/^.*\/src\//, "src/")}:${o.line}`; } }
  if (!cf.url) key = cf.functionName || "(program)";
  agg.set(key, (agg.get(key) ?? 0) + us);
}
const total = [...agg.values()].reduce((a, b) => a + b, 0);
console.log(`total sampled ${Math.round(total / 1000)} ms`);
console.log([...agg].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${String(Math.round(v / 1000)).padStart(6)} ms  ${k}`).join("\n"));
await b.close();

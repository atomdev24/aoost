// Trace one action in real Chrome and break the time down (style, layout, paint, script…).
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const port = process.argv[2] ?? "8799", what = process.argv[3] ?? "select";
const pw = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../../.dev.vars", import.meta.url), "utf8"))[1].trim();
const b = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await b.newContext({ viewport: { width: 1600, height: 869 }, deviceScaleFactor: 1.8, baseURL: `http://localhost:${port}`, serviceWorkers: "block" });
await ctx.request.post("/api/login", { data: { password: pw } });
const p = await ctx.newPage();
await p.goto("/admin/?page=home");
await p.evaluate(() => localStorage.setItem("aoost.board.home", JSON.stringify({ view: { x: 120, y: 120, zoom: 0.3 }, hidden: { mobile: false, tablet: false, desktop: false, widescreen: false }, positions: {} })));
await p.reload();
await p.waitForSelector(".bd-frame-active iframe"); await p.waitForFunction(() => document.querySelectorAll(".bd-still").length >= 3, null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(2500);
const frame = p.frameLocator(".bd-frame-active iframe");
if (what === "select2") { await frame.locator("h2").first().click(); await p.waitForTimeout(700); await p.keyboard.press("Escape"); await p.waitForTimeout(700); }
await b.startTracing(p, { path: `/tmp/trace-${what}.json`, categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.invalidationTracking", "blink", "cc", "viz"] });
if (what === "select2") { await frame.locator("h2").nth(1).click(); await p.waitForTimeout(600); }
if (what === "select") { await frame.locator("h2").first().click(); await p.waitForTimeout(600); }
if (what === "deselect") { await frame.locator("h2").first().click(); await p.waitForTimeout(600); await p.keyboard.press("Escape"); await p.waitForTimeout(600); }
if (what === "zoom") { const bd = await p.locator(".bd").boundingBox(); await p.mouse.move(bd.x + bd.width * 0.45, bd.y + bd.height * 0.45); await p.keyboard.down("Control"); for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, i < 20 ? -10 : 10); await p.waitForTimeout(8); } await p.keyboard.up("Control"); await p.waitForTimeout(800); }
await b.stopTracing();
const t = JSON.parse(readFileSync(`/tmp/trace-${what}.json`, "utf8"));
const ev = (t.traceEvents ?? t).filter((e) => e.ph === "X" && e.dur);
const pick = ["UpdateLayoutTree", "Layout", "Paint", "PrePaint", "Layerize", "UpdateLayer", "CompositeLayers", "FunctionCall", "EventDispatch", "RasterTask", "Decode Image", "ImageDecodeTask", "Commit", "ParseHTML", "HitTest", "ScheduleStyleRecalculation", "IntersectionObserverController::computeIntersections", "ResizeObserverController::DeliverObservations", "ScrollableAreaUpdate"];
const sum = {};
for (const e of ev) if (pick.includes(e.name)) { sum[e.name] = sum[e.name] ?? { total: 0, max: 0, n: 0 }; sum[e.name].total += e.dur / 1000; sum[e.name].max = Math.max(sum[e.name].max, e.dur / 1000); sum[e.name].n++; }
const big = ev.filter((e) => ["UpdateLayoutTree", "Layout", "Paint", "PrePaint", "Layerize", "FunctionCall", "RasterTask"].includes(e.name) && e.dur > 15000).map((e) => ({ name: e.name, ms: Math.round(e.dur / 1000), elements: e.args?.elementCount ?? e.args?.data?.elementCount, frame: (e.args?.data?.frame ?? "").slice(-6), url: (e.args?.data?.url ?? "").split("/").pop(), stack: (e.args?.beginData?.stackTrace ?? e.args?.data?.stackTrace ?? []).slice(0, 2).map((s) => s.functionName).join("<") })).sort((a, b) => b.ms - a.ms).slice(0, 15);
console.log(JSON.stringify({ what, sum: Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, { total: Math.round(v.total), max: Math.round(v.max), n: v.n }]).sort((a, b) => b[1].total - a[1].total)), big }, null, 1));
await b.close();

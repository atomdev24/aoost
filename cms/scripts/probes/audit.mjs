// Full editor audit in real Chrome: what the person feels (Event Timing: input → next paint), freezes
// with the code responsible (LoAF), errors, memory, and a screenshot of every state.
// Usage: node .probe/audit.mjs <port> <label> [w h dsf]
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const port = process.argv[2] ?? "8799", label = process.argv[3] ?? "audit";
const W = +(process.argv[4] ?? 1600), H = +(process.argv[5] ?? 869), DSF = +(process.argv[6] ?? 1.8);
const phone = W < 600;
const pw = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../../.dev.vars", import.meta.url), "utf8"))[1].trim();
const out = new URL(`../../.probe-out/${label}/`, import.meta.url).pathname; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, isMobile: phone, hasTouch: phone, baseURL: `http://localhost:${port}`, serviceWorkers: "block" });
await ctx.request.post("/api/login", { data: { password: pw } });
await ctx.request.post("/api/editor/reset", { headers: { Authorization: `Bearer ${pw}` } }).catch(() => {});
const p = await ctx.newPage();
const errors = [];
let current = "start";
p.on("pageerror", (e) => errors.push(`[${current}] pageerror: ` + String(e).slice(0, 160) + " @ " + (e.stack ?? "").split("\n").slice(1, 3).join(" ").slice(0, 200)));
p.on("response", (r) => r.status() === 404 && errors.push(`[${current}] 404: ` + r.url().replace(/^https?:\/\/[^/]+/, "").slice(0, 120)));
p.on("console", (m) => m.type() === "error" && errors.push(`[${current}] console: ` + m.text().slice(0, 200) + " " + (m.location()?.url ?? "").split("/").pop()));
p.on("requestfailed", (r) => !/favicon|fonts\.g/.test(r.url()) && errors.push(`[${current}] requestfailed: ` + r.url().replace(/^https?:\/\/[^/]+/, "").slice(0, 100) + " " + r.failure()?.errorText));
await p.addInitScript(() => {
  window.__ev = []; window.__loaf = [];
  const start = () => {
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__ev.push({ name: e.name, d: Math.round(e.duration), t: Math.round(e.startTime), proc: Math.round(e.processingEnd - e.processingStart), delay: Math.round(e.processingStart - e.startTime) }))).observe({ type: "event", durationThreshold: 16, buffered: true }); } catch {}
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__loaf.push({ d: Math.round(e.duration), t: Math.round(e.startTime), block: Math.round(e.blockingDuration ?? 0), scripts: [...(e.scripts ?? [])].sort((a, b) => b.duration - a.duration).slice(0, 2).map((s) => `${Math.round(s.duration)}ms ${s.invoker ?? ""} ${(s.sourceFunctionName ?? "")} ${(s.sourceURL ?? "").split("/").pop()}:${s.sourceCharPosition ?? ""}`) }))).observe({ type: "long-animation-frame", buffered: true }); } catch {}
  };
  if (window.top === window) start();
});
const steps = [];
let n = 0;
async function step(name, fn, { shot = true, settle = 500 } = {}) {
  current = name;
  const t0 = await p.evaluate(() => performance.now()).catch(() => 0);
  const w0 = Date.now();
  let ok = true, err;
  try { await fn(); } catch (e) { ok = false; err = String(e).split("\n")[0].slice(0, 160); }
  await p.waitForTimeout(settle);
  const t1 = await p.evaluate(() => performance.now()).catch(() => 0);
  const evs = await p.evaluate(([a, z]) => window.__ev.filter((e) => e.t >= a && e.t <= z), [t0, t1]).catch(() => []);
  const loafs = await p.evaluate(([a, z]) => window.__loaf.filter((e) => e.t >= a && e.t <= z && e.d > 100), [t0, t1]).catch(() => []);
  const worstInput = evs.reduce((m, e) => Math.max(m, e.d), 0);
  steps.push({ step: name, wallMs: Date.now() - w0 - settle, ok, err, worstInputMs: worstInput, slowInputs: evs.filter((e) => e.d >= 100).map((e) => `${e.name} ${e.d}ms (delay ${e.delay}, proc ${e.proc})`).slice(0, 4), longFrames: loafs.map((l) => `${l.d}ms: ${l.scripts.join(" | ")}`).slice(0, 3) });
  if (shot) await p.screenshot({ path: `${out}${String(++n).padStart(2, "0")}-${name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.png` });
}
const ms = (v) => ({ timeout: v });
const frame = () => p.frameLocator(".bd-frame-active iframe");
const timeUntil = async (fn, cond, limit = 15000) => { const t = Date.now(); await fn(); await p.waitForFunction(cond, null, ms(limit)); return Date.now() - t; };

// 1. Open
const opened = {};
await step("cold open", async () => {
  const t = Date.now();
  await p.goto("/admin/?page=home");
  await p.waitForSelector(".ed-island", ms(30000)); opened.toolbars = Date.now() - t;
  await p.waitForSelector(".bd-frame-active iframe", ms(30000));
  await p.waitForFunction(() => !document.querySelector(".bd-loading-chip"), null, ms(30000)); opened.framesReady = Date.now() - t;
  await p.waitForFunction(() => document.querySelectorAll(".bd-still").length >= 1, null, ms(20000)).catch(() => {}); opened.firstStill = Date.now() - t;
}, { settle: 800 });
// 2. Select a block, type in the inspector, undo/redo
await step("select heading", async () => { await frame().locator("h2").first().click(ms(8000)); await p.waitForSelector(".ed-inspector", ms(5000)); });
await step("type 12 chars in inspector", async () => {
  const input = p.locator(".ed-inspector input[type=text], .ed-inspector textarea").first();
  await input.click(ms(5000)); await input.press("End"); await input.pressSequentially(" stress test", { delay: 35 });
});
await step("undo x3", async () => { for (let i = 0; i < 3; i++) await p.keyboard.press("Meta+z"); });
await step("redo", async () => { await p.keyboard.press("Meta+Shift+z"); });
await step("escape deselect", async () => { await p.keyboard.press("Escape"); });
// 3. Breakpoints
for (const bp of phone ? [] : ["Mobile", "Tablet", "Widescreen", "Desktop"]) await step(`switch to ${bp}`, async () => { await p.locator(".ed-island-bps").getByRole("button", { name: bp, exact: true }).click(ms(5000)); }, { settle: 700 });
// 4. Panels
for (const name of ["Layers", "Pages", "Insert", "Media", "Navigation", "Theme", "Fonts", "Global"]) await step(`panel ${name}`, async () => { await p.locator(".ed-rail").getByRole("button", { name, exact: true }).click(ms(4000)); }, { settle: 600 });
await step("close panel", async () => { await p.keyboard.press("Escape"); });
// 5. Page switching (every page)
const pages = await p.evaluate(async () => { const r = await fetch("/api/editor/site", { credentials: "same-origin" }); const s = await r.json(); return (s.site ?? s).pages.map((x) => ({ id: x.id, title: x.title })); }).catch(() => []);
const switches = {};
for (const pg of pages.slice(0, 7)) {
  await step(`open page ${pg.id}`, async () => {
    const t = Date.now();
    await p.locator(".ed-switcher-btn").click(ms(4000));
    await p.locator(".ed-switcher .ed-menu button").filter({ hasText: pg.title }).first().click(ms(4000));
    await p.waitForFunction((id) => new URL(location.href).searchParams.get("page") === id, pg.id, ms(8000)).catch(() => {});
    await p.waitForFunction(() => !document.querySelector(".bd-loading-chip"), null, ms(20000));
    switches[pg.id] = Date.now() - t;
  }, { settle: 600 });
}
await step("back to home", async () => { await p.goto("/admin/?page=home"); await p.waitForFunction(() => !document.querySelector(".bd-loading-chip"), null, ms(20000)); }, { settle: 1500 });
// 6. Palette, shortcuts, publish, preview, more menu, report
await step("palette open", async () => { await p.keyboard.press("Meta+k"); await p.waitForSelector(".ed-palette, [role=dialog]", ms(3000)); });
await step("palette type", async () => { await p.keyboard.type("journ", { delay: 40 }); });
await step("palette close", async () => { await p.keyboard.press("Escape"); });
await step("shortcuts sheet", async () => { await p.keyboard.press("Shift+?"); });
await step("shortcuts close", async () => { await p.keyboard.press("Escape"); });
// Never the Publish button itself: only the sheet that lists what would go out (the badge).
await step("publish sheet", async () => { await p.locator(".ed-island-right .ed-publish-badge").first().click(ms(4000)); }, { settle: 900 });
await step("publish close", async () => { await p.keyboard.press("Escape"); });
await step("more menu", async () => { await p.getByRole("button", { name: "More", exact: true }).click(ms(4000)); });
await step("report dialog", async () => { await p.getByRole("menuitem", { name: "Report a problem…" }).click(ms(4000)); });
await step("report close", async () => { await p.keyboard.press("Escape"); });
// 7. Board: zoom, fit, pan
await step("fit all", async () => { await p.keyboard.press("Shift+1"); }, { settle: 800 });
await step("zoom burst", async () => {
  const bd = await p.locator(".bd").boundingBox(); await p.mouse.move(bd.x + bd.width * 0.45, bd.y + bd.height * 0.45);
  await p.keyboard.down("Control"); for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, i < 30 ? -10 : 10); await p.waitForTimeout(8); } await p.keyboard.up("Control");
}, { settle: 900 });
await step("pan burst", async () => { for (let i = 0; i < 60; i++) { await p.mouse.wheel(i < 30 ? 15 : -15, i < 30 ? 10 : -10); await p.waitForTimeout(8); } }, { settle: 900 });
// 8. Insert a section, then a block via quick insert, delete it
await step("quick insert", async () => { await frame().locator("h2").first().click(ms(8000)); await p.keyboard.press("/"); await p.waitForTimeout(300); });
await step("quick insert close", async () => { await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); });
// 9. Preview (new tab)
await step("preview", async () => { const [tab] = await Promise.all([ctx.waitForEvent("page", ms(8000)), p.locator(".ed-island-right").getByRole("button", { name: "Preview" }).click()]); await tab.waitForLoadState("load", ms(15000)); await tab.screenshot({ path: out + "preview-tab.png" }); await tab.close(); });

const mem = await p.evaluate(() => ({ heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6), domNodes: document.querySelectorAll("*").length, frameNodes: [...document.querySelectorAll("iframe")].map((f) => { try { return f.contentDocument.querySelectorAll("*").length; } catch { return -1; } }) }));
const allLoaf = await p.evaluate(() => window.__loaf.filter((l) => l.d > 200).map((l) => ({ d: l.d, s: l.scripts[0] })).sort((a, b) => b.d - a.d).slice(0, 12));
writeFileSync(out + "audit.json", JSON.stringify({ label, viewport: [W, H, DSF], opened, switches, steps, mem, topLongFrames: allLoaf, errors: [...new Set(errors)] }, null, 1));
console.log(JSON.stringify({ opened, switches, mem, errors: [...new Set(errors)].length }));
await b.close();

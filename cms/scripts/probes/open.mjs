// How fast the editor opens, in real Chrome: the editor's own marks (modules run, draft loaded,
// shell drawn, board usable), the long frames while opening, and how much script it loaded.
// Cold = a fresh browser profile (nothing cached); warm = a reload with the cache filled.
// Usage: node scripts/probes/open.mjs <port> <label> [runs] [w h]   (writes .probe-out/<label>/open.json)
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const port = process.argv[2] ?? "8799", label = process.argv[3] ?? "open";
const runs = +(process.argv[4] ?? 5), W = +(process.argv[5] ?? 1600), H = +(process.argv[6] ?? 869);
const pw = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../../.dev.vars", import.meta.url), "utf8"))[1].trim();
const out = new URL(`../../.probe-out/${label}/`, import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const MARKS = ["aoost:modules", "aoost:draft", "aoost:shell", "aoost:board"];

const b = await chromium.launch({ channel: "chrome" });

async function measure(p) {
  await p.waitForFunction(() => performance.getEntriesByName("aoost:board").length > 0, null, { timeout: 30_000 });
  await p.waitForTimeout(1500); // the frames just after opening count too
  return p.evaluate((marks) => {
    const at = (n) => Math.round(performance.getEntriesByName(n)[0]?.startTime ?? -1);
    const board = at("aoost:board");
    const js = performance.getEntriesByType("resource").filter((r) => /\/admin\/assets\/.*\.js$/.test(r.name));
    return {
      marks: Object.fromEntries(marks.map((m) => [m.replace("aoost:", ""), at(m)])),
      longFrames: (window.__loaf ?? []).filter((f) => f.t <= board + 1500).map((f) => f.d),
      afterBoard: (window.__loaf ?? []).filter((f) => f.t > board && f.t <= board + 1500).map((f) => f.d),
      scriptKB: Math.round(js.reduce((n, r) => n + (r.decodedBodySize || 0), 0) / 1024),
      scriptFiles: js.length,
    };
  }, MARKS);
}

const init = () => {
  window.__loaf = [];
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__loaf.push({ d: Math.round(e.duration), t: Math.round(e.startTime) }))).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
};

const results = { cold: [], warm: [] };
for (let i = 0; i < runs; i++) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, baseURL: `http://localhost:${port}`, serviceWorkers: "block" });
  await ctx.request.post("/api/login", { data: { password: pw } });
  const p = await ctx.newPage();
  await p.addInitScript(init);
  await p.goto("/admin/?page=home");
  results.cold.push(await measure(p));
  await p.reload();
  results.warm.push(await measure(p));
  await ctx.close();
}
await b.close();

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const summary = {};
for (const kind of ["cold", "warm"]) {
  const r = results[kind];
  summary[kind] = {
    ...Object.fromEntries(MARKS.map((m) => [m.replace("aoost:", ""), median(r.map((x) => x.marks[m.replace("aoost:", "")]))])),
    longestFrame: median(r.map((x) => Math.max(0, ...x.longFrames))),
    longestAfterBoard: median(r.map((x) => Math.max(0, ...x.afterBoard))),
    scriptKB: median(r.map((x) => x.scriptKB)),
    scriptFiles: median(r.map((x) => x.scriptFiles)),
  };
}
writeFileSync(`${out}open.json`, JSON.stringify({ runs, viewport: [W, H], summary, results }, null, 2));
console.log(`median of ${runs} runs (ms from navigation start)`);
console.table(summary);

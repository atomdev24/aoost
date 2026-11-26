import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
for (const path of ["/", "/work", "/journal"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const P = await ctx.newPage(); const cdp = await ctx.newCDPSession(P);
  await cdp.send("Network.enable"); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 1, uploadThroughput: 750e3 / 8 });
  let bytes = 0, js = 0; const types = {};
  cdp.on("Network.responseReceived", (e) => (types[e.requestId] = e.type));
  cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; if (types[e.requestId] === "Script") js += e.encodedDataLength; });
  await P.addInitScript(() => { window.__v = { lcp: 0, cls: 0, tbt: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.tbt += Math.max(0, e.duration - 50); }).observe({ type: "longtask", buffered: true }); });
  await P.goto("http://localhost:8790" + path, { waitUntil: "load", timeout: 120000 }); await P.waitForTimeout(4000);
  const v = await P.evaluate(() => { const n = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint"); return { ...window.__v, fcp: n?.startTime ?? 0 }; });
  console.log(path, { fcpMs: Math.round(v.fcp), lcpMs: Math.round(v.lcp), cls: +v.cls.toFixed(3), blockingMs: Math.round(v.tbt), totalKB: Math.round(bytes / 1024), jsKB: Math.round(js / 1024) });
  await ctx.close();
}
await b.close();

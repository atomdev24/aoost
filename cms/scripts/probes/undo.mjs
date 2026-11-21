import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const pw = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../../.dev.vars", import.meta.url), "utf8"))[1].trim();
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1600, height: 869 }, baseURL: "http://localhost:8799", serviceWorkers: "block" });
await ctx.request.post("/api/login", { data: { password: pw } });
await ctx.request.post("/api/editor/reset", { headers: { Authorization: `Bearer ${pw}`, "Content-Type": "application/json" } });
const p = await ctx.newPage();
await p.goto("/admin/?page=home");
await p.evaluate(() => localStorage.setItem("aoost.board.home", JSON.stringify({ view: { x: 120, y: 120, zoom: 0.3 }, hidden: { mobile: false, tablet: false, desktop: false, widescreen: false }, positions: {} })));
await p.reload(); await p.waitForSelector(".bd-frame-active iframe"); await p.waitForTimeout(4000);
const read = async (label) => {
  const r = await p.evaluate(() => {
    const out = {};
    const input = document.querySelector(".ed-inspector input[type=text], .ed-inspector textarea");
    out.field = input?.value;
    out.canUndo = !document.querySelector('button[aria-label="Undo"]')?.disabled;
    out.canRedo = !document.querySelector('button[aria-label="Redo"]')?.disabled;
    for (const f of document.querySelectorAll(".bd-frame")) { const d = f.querySelector("iframe")?.contentDocument; const h = [...(d?.querySelectorAll("h2") ?? [])].find((x) => /Projects/.test(x.textContent)); out[f.dataset.bp + (f.classList.contains("is-still") ? "(still)" : "")] = h?.textContent; }
    return out;
  });
  const draft = await (await ctx.request.get("/api/editor/site", { headers: { Authorization: `Bearer ${pw}` } })).json().catch(() => null);
  const pg = (draft?.site ?? draft)?.pages?.find((x) => x.id === "home");
  const txt = JSON.stringify(pg ?? {}).match(/Projects[^"]*/)?.[0];
  console.log(label.padEnd(18), JSON.stringify(r), "| server:", txt);
};
await p.frameLocator(".bd-frame-active iframe").locator("h2", { hasText: "Projects" }).first().click(); await p.waitForTimeout(500);
await read("selected");
const input = p.locator(".ed-inspector input[type=text], .ed-inspector textarea").first();
await input.click(); await input.press("Meta+ArrowRight"); await input.pressSequentially(" stress test", { delay: 35 }); await p.waitForTimeout(1500);
await read("typed");
if (process.env.BUTTONS) {
  await p.locator(".ed-inspector-title").click(); await p.waitForTimeout(400); await read("blurred");
  await p.locator('button[aria-label="Undo"]').click(); await p.waitForTimeout(800); await read("undo btn");
  await p.locator('button[aria-label="Redo"]').click(); await p.waitForTimeout(800); await read("redo btn");
} else {
await p.keyboard.press("Meta+z"); await p.waitForTimeout(600); await read("undo 1");
await p.keyboard.press("Meta+z"); await p.waitForTimeout(600); await read("undo 2");
await p.keyboard.press("Meta+z"); await p.waitForTimeout(600); await read("undo 3");
await p.keyboard.press("Meta+Shift+z"); await p.waitForTimeout(600); await read("redo");
}
await p.waitForTimeout(3000); await read("3s later");
await b.close();

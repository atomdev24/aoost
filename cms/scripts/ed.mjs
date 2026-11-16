// Dev helper: open the editor signed in, optionally run a steps module, take a screenshot.
//   node scripts/ed.mjs <out.png> [steps.mjs] [--width 1440] [--height 900]
// steps.mjs exports `default async (page) => {}`.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : fallback;
};
const width = Number(flag("width", 1440));
const height = Number(flag("height", 900));
const base = flag("base", "http://localhost:8787");
const [out, steps] = args;

const password = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(new URL("../.dev.vars", import.meta.url), "utf8"))?.[1]?.trim();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();
page.on("console", (m) => (m.type() === "error" || m.type() === "warning" || m.text().startsWith("DBG")) && console.log(`[${m.type()}]`, m.text().slice(0, 400)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 600)));
const login = await context.request.post(`${base}/api/login`, { data: { password } });
if (!login.ok()) throw new Error(`login failed: ${login.status()}`);
await page.goto(`${base}/admin/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
if (steps) await (await import(pathToFileURL(resolve(steps)).href)).default(page);
if (out) await page.screenshot({ path: out });
await browser.close();

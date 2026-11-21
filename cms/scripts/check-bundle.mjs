// The editor's first layer: the entry script plus everything it preloads (what must arrive and run
// before the board can draw). Fails the build when it grows past the budget (decided 21 Nov 2026),
// so a slower opening is caught the day it's added. Lower the budget as each phase lands.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = JSON.parse(readFileSync(new URL("./bundle-budget.json", import.meta.url), "utf8")).firstLayerKB;
const dir = new URL("../dist/admin/", import.meta.url).pathname;
const html = readFileSync(dir + "index.html", "utf8");
const files = [...new Set([...html.matchAll(/(?:src|href)="\/admin\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]))];
let raw = 0, gz = 0;
for (const f of files) {
  const body = readFileSync(dir + f);
  raw += body.length;
  gz += gzipSync(body).length;
}
const all = readdirSync(dir + "assets").filter((f) => f.endsWith(".js"));
const later = all.filter((f) => !files.includes("assets/" + f)).reduce((n, f) => n + statSync(dir + "assets/" + f).size, 0);
const kb = (n) => Math.round(n / 1024);
console.log(`check-bundle: first layer ${kb(raw)} KB (${kb(gz)} KB compressed) in ${files.length} file(s); ${kb(later)} KB loads later; budget ${BUDGET_KB} KB`);
if (kb(raw) > BUDGET_KB) {
  console.error(`check-bundle: the first layer is over budget by ${kb(raw) - BUDGET_KB} KB. Load the new code later (React.lazy / import()), or raise the budget in scripts/bundle-budget.json on purpose.`);
  process.exit(1);
}

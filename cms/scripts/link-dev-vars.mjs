// wrangler reads .dev.vars next to wrangler.toml (cms/). Alex keeps the real
// file at the repo root, so link it here. Both paths are gitignored.
import { existsSync, symlinkSync, lstatSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const cms = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(cms, "..", ".dev.vars");
const link = resolve(cms, ".dev.vars");
let linked = false;
try {
  lstatSync(link);
  linked = true;
} catch {}
if (!linked && existsSync(target)) symlinkSync(target, link);

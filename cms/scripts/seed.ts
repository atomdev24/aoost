// Writes the seed site into ../content. Run once: `npx tsx scripts/seed.ts` (add --force to overwrite).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { siteToFiles, validateSite } from "../src/schema";
import { seedSite } from "../src/seed/site";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
if (existsSync(resolve(repo, "content/site.json")) && !process.argv.includes("--force")) {
  console.error("content/ already exists. Pass --force to overwrite it with the seed.");
  process.exit(1);
}
const result = validateSite(seedSite);
if (!result.ok) {
  console.error(result.issues);
  process.exit(1);
}
for (const [path, body] of Object.entries(siteToFiles(result.site))) {
  const file = resolve(repo, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  console.log("wrote", path);
}

// Pre-render the public site from content/ into dist/ (the Worker's static assets).
//   content/*.json  →  dist/*.html, _redirects, search.json, robots.txt
//   src/runtime     →  dist/assets/site.js
//   static/, ../art, ../assets/fonts are copied as they are. dist/admin is left alone.
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "../src/render/build";
import { loadSite } from "../src/schema/load-node";

const cms = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(cms, "..");
const dist = resolve(cms, "dist");

mkdirSync(dist, { recursive: true });
for (const entry of readdirSync(dist)) if (entry !== "admin") rmSync(resolve(dist, entry), { recursive: true, force: true });

const site = loadSite(repo);
const files = buildSite(site, { siteUrl: process.env.SITE_URL || undefined, assetVersion: Date.now().toString(36) });
for (const [path, body] of Object.entries(files)) {
  const file = resolve(dist, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

cpSync(resolve(cms, "static"), dist, { recursive: true });
if (existsSync(resolve(repo, "art"))) cpSync(resolve(repo, "art"), resolve(dist, "art"), { recursive: true });
if (existsSync(resolve(repo, "assets/fonts"))) {
  cpSync(resolve(repo, "assets/fonts"), resolve(dist, "fonts"), { recursive: true, filter: (src) => !src.endsWith(".txt") && !src.endsWith(".DS_Store") });
}

await build({
  entryPoints: [resolve(cms, "src/runtime/index.ts")],
  outfile: resolve(dist, "assets/site.js"),
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
});

console.log(`build-site: ${Object.keys(files).filter((f) => f.endsWith(".html")).length} pages → dist/`);

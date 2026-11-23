// Pre-render the public site from content/ into dist/ (the Worker's static assets).
//   content/*.json  →  dist/*.html, _redirects, search.json, robots.txt
//   src/runtime     →  dist/assets/site.js
//   static/, ../art, ../assets/fonts are copied as they are. dist/admin is left alone.
import { build } from "esbuild";
import sharp from "sharp";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "../src/render/build";
import { STATIC_WIDTHS, staticVariant } from "../src/render/media";
import { siteToFiles } from "../src/schema";
import { loadSite } from "../src/schema/load-node";

const cms = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(cms, "..");
const dist = resolve(cms, "dist");

mkdirSync(dist, { recursive: true });
for (const entry of readdirSync(dist)) if (entry !== "admin") rmSync(resolve(dist, entry), { recursive: true, force: true });

const site = loadSite(repo);
// Share tags need absolute URLs; the site's own domain comes from the repo's CNAME file.
const cname = existsSync(resolve(repo, "CNAME")) ? readFileSync(resolve(repo, "CNAME"), "utf8").trim() : "";
const files = buildSite(site, { siteUrl: process.env.SITE_URL || undefined, shareOrigin: cname ? `https://${cname}` : undefined, assetVersion: Date.now().toString(36) });
for (const [path, body] of Object.entries(files)) {
  const file = resolve(dist, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

// The published content, for the draft store to start from and compare against (not publicly served).
writeFileSync(resolve(dist, "_published.json"), JSON.stringify(siteToFiles(site)));

cpSync(resolve(cms, "static"), dist, { recursive: true });
if (existsSync(resolve(repo, "art"))) {
  cpSync(resolve(repo, "art"), resolve(dist, "art"), { recursive: true });
  // The repo's own artwork gets resized WebP copies (never enlarged), like uploads do in the editor.
  for (const file of readdirSync(resolve(repo, "art")).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))) {
    for (const width of STATIC_WIDTHS) {
      await sharp(resolve(repo, "art", file)).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(resolve(dist, "art", staticVariant(file, width)));
    }
  }
}
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

// Players that only some pages need: separate files, loaded on demand by runtime/lazy.ts.
await build({ entryPoints: [resolve(cms, "src/runtime/lottie-entry.ts")], outfile: resolve(dist, "assets/lottie.js"), bundle: true, minify: true, format: "iife", target: "es2020" });
await build({ entryPoints: [resolve(cms, "src/runtime/model-viewer-entry.ts")], outfile: resolve(dist, "assets/model-viewer.js"), bundle: true, minify: true, format: "esm", target: "es2020" });

// The aoost homepage's own scripts (the ported original), loaded only on pages that use those blocks.
await build({ entryPoints: [resolve(cms, "src/components/aoost/runtime/index.js")], outfile: resolve(dist, "assets/aoost.js"), bundle: true, minify: true, format: "iife", target: "es2020" });
// The TrueFruit by season block's script (ported from the Framer component), loaded only on pages that use it.
await build({ entryPoints: [resolve(cms, "src/components/TrueFruitSeason/runtime.ts")], outfile: resolve(dist, "assets/truefruit.js"), bundle: true, minify: true, format: "iife", target: "es2020" });
// The rodeo's horse-and-rider sprite sheet sits at the repo root; the game loads it from /rider.png.
if (existsSync(resolve(repo, "rider.png"))) cpSync(resolve(repo, "rider.png"), resolve(dist, "rider.png"));

console.log(`build-site: ${Object.keys(files).filter((f) => f.endsWith(".html")).length} pages → dist/`);

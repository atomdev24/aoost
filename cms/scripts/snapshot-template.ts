// Save a page from the demo editor as a template snapshot (src/editor/templates/snapshots/<name>.json).
//   npx tsx scripts/snapshot-template.ts [pageId=home] [name=home-concept]
// The template then lists it in the demo's Templates panel; run it again to refresh the snapshot.
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [pageId = "home", name = "home-concept"] = process.argv.slice(2);
const res = await fetch("https://alexoostendurp.com/demo/api/editor/site");
if (!res.ok) throw new Error(`The demo answered ${res.status}`);
const { site, version } = (await res.json()) as { site: { pages: { id: string; title: string; hideNav?: boolean; sections: unknown[] }[] }; version: number };
const page = site.pages.find((p) => p.id === pageId);
if (!page) throw new Error(`No page "${pageId}" in the demo (pages: ${site.pages.map((p) => p.id).join(", ")})`);
const file = resolve(dirname(fileURLToPath(import.meta.url)), `../src/editor/templates/snapshots/${name}.json`);
const snapshot = { from: `demo page "${page.title}" (${pageId}), draft version ${version}`, savedAt: new Date().toISOString().slice(0, 10), hideNav: !!page.hideNav, sections: page.sections };
writeFileSync(file, JSON.stringify(snapshot, null, 1) + "\n");
console.log(`Saved ${page.sections.length} sections from "${page.title}" to ${file}`);

// Placeholder: the static renderer lands in Phase 1, item 5.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, "index.html"), "<!doctype html><meta charset=utf-8><title>aoost</title><h1>Howdy from aoost</h1>");
writeFileSync(resolve(dist, "404.html"), "<!doctype html><meta charset=utf-8><title>Not found</title><h1>Nothing here, partner</h1>");
console.log("build-site: wrote placeholder pages");

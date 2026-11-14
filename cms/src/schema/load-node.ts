import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { filesToSite, validateSite, type ContentFiles, type Site } from "./index";

/** Read content/ from disk (build script and tests only; the Worker never touches fs). */
export function readContentFiles(repoRoot: string): ContentFiles {
  const files: ContentFiles = {};
  for (const name of ["content/site.json", "content/collections.json"]) files[name] = readFileSync(resolve(repoRoot, name), "utf8");
  for (const f of readdirSync(resolve(repoRoot, "content/pages"))) {
    if (f.endsWith(".json")) files[`content/pages/${f}`] = readFileSync(resolve(repoRoot, "content/pages", f), "utf8");
  }
  return files;
}

export function loadSite(repoRoot: string): Site {
  const result = validateSite(filesToSite(readContentFiles(repoRoot)));
  if (!result.ok) throw new Error("content/ is invalid:\n" + result.issues.map((i) => `  ${i.path}: ${i.message}`).join("\n"));
  return result.site;
}

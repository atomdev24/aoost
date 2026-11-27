import { Site, type Page } from "./content";

/**
 * How a Site maps to files under content/ (the git-versioned source of truth):
 *   content/site.json          settings, theme, nav, globals, templates, redirects, page order
 *   content/collections.json   diary entries and playlists
 *   content/cms.json           collections managed in the table view (absent = none)
 *   content/pages/<id>.json    one file per page
 * One file per page keeps git diffs and history readable.
 */
export type ContentFiles = Record<string, string>;

const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

export function siteToFiles(site: Site): ContentFiles {
  const { pages, collections, cms, ...rest } = site;
  const files: ContentFiles = {
    "content/site.json": json({ ...rest, pageOrder: pages.map((p) => p.id) }),
    "content/collections.json": json(collections),
  };
  // Only sites that use collections get the file, so nothing changes for the others.
  if (cms?.length) files["content/cms.json"] = json(cms);
  for (const p of pages) files[`content/pages/${p.id}.json`] = json(p);
  return files;
}

export function filesToSite(files: ContentFiles): unknown {
  const read = (path: string) => {
    const text = files[path];
    if (text === undefined) throw new Error(`missing ${path}`);
    return JSON.parse(text) as Record<string, unknown>;
  };
  const { pageOrder, ...rest } = read("content/site.json") as { pageOrder?: string[] } & Record<string, unknown>;
  const pages = new Map<string, Page>();
  for (const [path, text] of Object.entries(files)) {
    const m = /^content\/pages\/([^/]+)\.json$/.exec(path);
    if (m) pages.set(m[1]!, JSON.parse(text) as Page);
  }
  const ordered: Page[] = [];
  for (const id of pageOrder ?? []) {
    const p = pages.get(id);
    if (p) {
      ordered.push(p);
      pages.delete(id);
    }
  }
  ordered.push(...pages.values());
  const cms = files["content/cms.json"] === undefined ? [] : JSON.parse(files["content/cms.json"]);
  return { ...rest, collections: read("content/collections.json"), cms, pages: ordered };
}

import type { Redirect, Site } from "../schema";

/**
 * Collapse chains (a → b, b → c becomes a → c), drop loops and anything that
 * points at itself or is shadowed by a live page.
 */
export function flattenRedirects(redirects: Redirect[], liveSlugs: Set<string>): Redirect[] {
  const map = new Map(redirects.map((r) => [r.from, r.to]));
  const out: Redirect[] = [];
  for (const from of map.keys()) {
    if (liveSlugs.has(from)) continue;
    let to = map.get(from)!;
    const seen = new Set([from]);
    while (map.has(to) && !liveSlugs.has(to) && !seen.has(to)) {
      seen.add(to);
      to = map.get(to)!;
    }
    if (seen.has(to)) continue; // loop
    out.push({ from, to });
  }
  return out;
}

/** Cloudflare static-assets `_redirects` file. */
export function redirectsFile(site: Site): string {
  const live = new Set(site.pages.filter((p) => p.status !== "draft").map((p) => p.slug));
  return flattenRedirects(site.redirects, live)
    .map((r) => `${r.from} ${r.to} 301`)
    .join("\n")
    .concat("\n");
}

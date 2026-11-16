import type { Page, Site } from "../schema";
import { deepEqual } from "../responsive/resolve";

/**
 * The unit of change between the editor, the draft store and the Claude
 * connector. Ops are page-granular: small enough to sync live, simple enough
 * that "last write wins per page" is easy to reason about.
 */
export type MetaKey = "settings" | "theme" | "nav" | "globals" | "templates" | "collections" | "redirects";
export const META_KEYS: MetaKey[] = ["settings", "theme", "nav", "globals", "templates", "collections", "redirects"];

export type Op =
  | { op: "putPage"; page: Page }
  | { op: "deletePage"; pageId: string }
  | { op: "setPageOrder"; order: string[] }
  | { op: "set"; key: MetaKey; value: unknown };

export function applyOps(site: Site, ops: Op[]): Site {
  let next = site;
  for (const o of ops) {
    switch (o.op) {
      case "putPage": {
        const i = next.pages.findIndex((p) => p.id === o.page.id);
        const pages = i >= 0 ? next.pages.map((p, j) => (j === i ? o.page : p)) : [...next.pages, o.page];
        next = { ...next, pages };
        break;
      }
      case "deletePage":
        next = { ...next, pages: next.pages.filter((p) => p.id !== o.pageId) };
        break;
      case "setPageOrder": {
        const byId = new Map(next.pages.map((p) => [p.id, p]));
        const ordered = o.order.map((id) => byId.get(id)).filter((p): p is Page => !!p);
        const rest = next.pages.filter((p) => !o.order.includes(p.id));
        next = { ...next, pages: [...ordered, ...rest] };
        break;
      }
      case "set":
        next = { ...next, [o.key]: o.value } as Site;
        break;
    }
  }
  return next;
}

/** The ops that turn `a` into `b`. Unchanged pages and keys produce nothing. */
export function diffSite(a: Site, b: Site): Op[] {
  const ops: Op[] = [];
  for (const key of META_KEYS) {
    if (a[key] !== b[key] && !deepEqual(a[key], b[key])) ops.push({ op: "set", key, value: b[key] });
  }
  const before = new Map(a.pages.map((p) => [p.id, p]));
  for (const p of b.pages) {
    const old = before.get(p.id);
    if (!old || (old !== p && !deepEqual(old, p))) ops.push({ op: "putPage", page: p });
    before.delete(p.id);
  }
  for (const id of before.keys()) ops.push({ op: "deletePage", pageId: id });
  const orderA = a.pages.filter((p) => !before.has(p.id)).map((p) => p.id);
  const orderB = b.pages.map((p) => p.id);
  if (!deepEqual(orderA, orderB) && b.pages.length) ops.push({ op: "setPageOrder", order: orderB });
  return ops;
}

/** Ids of pages an op list touches (for highlighting and cache decisions). */
export function touchedPages(ops: Op[]): string[] {
  return [...new Set(ops.flatMap((o) => (o.op === "putPage" ? [o.page.id] : o.op === "deletePage" ? [o.pageId] : [])))];
}

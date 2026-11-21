import { deepEqual } from "../responsive/resolve";
import type { Node, Page, Site } from "../schema";
import { getComponent } from "../components/registry";

/** One page (or "Site") in the publish sheet, with the blocks that changed on it. */
export type PageChanges = { id: string; title: string; items: string[] };
export type ChangeSummary = { count: number; pages: PageChanges[] };

const META: { key: keyof Site; name: string }[] = [
  { key: "nav", name: "Navigation" },
  { key: "theme", name: "Theme" },
  { key: "settings", name: "Site settings" },
  { key: "globals", name: "Global components" },
  { key: "templates", name: "Templates" },
  { key: "collections", name: "Collections" },
  { key: "redirects", name: "Redirects" },
];

const nodeName = (n: Node) => n.name ?? getComponent(n.type)?.label.split(":")[0] ?? n.type;

/** What changed on one page, in the publish sheet's words ("Added Text", "Removed section", "Section order"). */
export function pageItems(before: Page, after: Page): string[] {
  const items: string[] = [];
  const { sections: sa, overlays: oa, ...restA } = before;
  const { sections: sb, overlays: ob, ...restB } = after;
  if (!deepEqual(restA, restB)) items.push("Page settings");
  const nodesA = new Map(sa.flatMap((s) => s.children.map((n) => [n.id, n] as const)));
  const sectionsA = new Map(sa.map((s) => [s.id, s]));
  for (const s of sb) {
    const old = sectionsA.get(s.id);
    if (!old) {
      items.push(`New section${s.name ? `: ${s.name}` : ""}`);
      continue;
    }
    const { children: ca, ...sA } = old;
    const { children: cb, ...sB } = s;
    if (!deepEqual(sA, sB)) items.push(s.name ?? "Section layout");
    for (const n of cb) {
      const was = nodesA.get(n.id);
      if (!was) items.push(`Added ${nodeName(n)}`);
      else if (!deepEqual(was, n)) items.push(nodeName(n));
    }
    if (ca.map((n) => n.id).join() !== cb.filter((n) => nodesA.has(n.id)).map((n) => n.id).join() && ca.every((n) => cb.some((m) => m.id === n.id))) items.push(`Order in ${s.name ?? "a section"}`);
  }
  const nodesB = new Set(sb.flatMap((s) => s.children.map((n) => n.id)));
  for (const [id, n] of nodesA) if (!nodesB.has(id)) items.push(`Removed ${nodeName(n)}`);
  for (const s of sa) if (!sb.some((x) => x.id === s.id)) items.push(`Removed section${s.name ? `: ${s.name}` : ""}`);
  if (sa.map((s) => s.id).join() !== sb.filter((s) => sectionsA.has(s.id)).map((s) => s.id).join() && sa.every((s) => sb.some((x) => x.id === s.id))) items.push("Section order");
  if (!deepEqual(oa, ob)) items.push("Overlays");
  return [...new Set(items)];
}

/** Which pages and blocks the draft changes compared with what is live. Each item counts as one change. */
export function summarizeChanges(published: Site, draft: Site): ChangeSummary {
  const pages: PageChanges[] = [];
  const before = new Map(published.pages.map((p) => [p.id, p]));
  for (const p of draft.pages) {
    const old = before.get(p.id);
    if (!old) pages.push({ id: p.id, title: p.title, items: ["New page"] });
    else if (!deepEqual(old, p)) {
      const items = pageItems(old, p);
      if (items.length) pages.push({ id: p.id, title: p.title, items });
    }
  }
  for (const p of published.pages) if (!draft.pages.some((x) => x.id === p.id)) pages.push({ id: p.id, title: p.title, items: ["Deleted page"] });
  const meta = META.filter((m) => !deepEqual(published[m.key], draft[m.key])).map((m) => m.name);
  if (meta.length) pages.push({ id: "site", title: "Site", items: meta });
  return { count: pages.reduce((n, p) => n + p.items.length, 0), pages };
}

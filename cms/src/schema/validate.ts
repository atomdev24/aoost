import { z } from "zod";
import { Site, type NavItem, type Node, type Section } from "./content";

export type Issue = { path: string; message: string };

/** Per-component content schemas, registered by each component folder. */
const contentSchemas = new Map<string, z.ZodType>();
export function registerContentSchema(type: string, schema: z.ZodType) {
  contentSchemas.set(type, schema);
}

function eachNode(site: Site, fn: (node: Node, path: string) => void) {
  const sections = (list: Section[], path: string) =>
    list.forEach((s, si) => s.children.forEach((n, ni) => fn(n, `${path}[${si}].children[${ni}]`)));
  site.pages.forEach((p, pi) => {
    sections(p.sections, `pages[${pi}].sections`);
    p.overlays.forEach((o, oi) => fn(o.node, `pages[${pi}].overlays[${oi}].node`));
  });
  site.globals.forEach((g, gi) => fn(g.node, `globals[${gi}].node`));
  site.templates.forEach((t, ti) => sections(t.sections, `templates[${ti}].sections`));
  const nav = (items: NavItem[], path: string) =>
    items.forEach((it, i) => {
      if (it.panel) sections(it.panel, `${path}[${i}].panel`);
      if (it.children) nav(it.children, `${path}[${i}].children`);
    });
  nav(site.nav.items, "nav.items");
}

/**
 * Parse and cross-check a whole site: schema shape, then the rules a schema
 * alone can't express (unique ids and slugs, one home page, valid parents,
 * one nesting level, link targets that exist).
 */
export function validateSite(input: unknown): { ok: true; site: Site } | { ok: false; issues: Issue[] } {
  const parsed = Site.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  }
  const site = parsed.data;
  const issues: Issue[] = [];
  const pageIds = new Map(site.pages.map((p) => [p.id, p]));

  if (pageIds.size !== site.pages.length) issues.push({ path: "pages", message: "duplicate page id" });
  const slugs = new Set<string>();
  for (const p of site.pages) {
    if (slugs.has(p.slug)) issues.push({ path: `pages.${p.id}.slug`, message: `duplicate URL ${p.slug}` });
    slugs.add(p.slug);
    if (p.parentId) {
      const parent = pageIds.get(p.parentId);
      if (!parent) issues.push({ path: `pages.${p.id}.parentId`, message: "parent page does not exist" });
      else if (parent.parentId) issues.push({ path: `pages.${p.id}.parentId`, message: "pages nest one level deep" });
      else if (!p.slug.startsWith(parent.slug === "/" ? "/" : parent.slug + "/"))
        issues.push({ path: `pages.${p.id}.slug`, message: "a sub-page URL must sit under its parent" });
    }
    if (p.isHome && p.slug !== "/") issues.push({ path: `pages.${p.id}.slug`, message: "the home page lives at /" });
  }
  const homes = site.pages.filter((p) => p.isHome);
  if (homes.length !== 1) issues.push({ path: "pages", message: `expected exactly one home page, found ${homes.length}` });

  const nodeIds = new Set<string>();
  eachNode(site, (node, path) => {
    const key = path.split(".")[0] + ":" + node.id;
    if (nodeIds.has(key)) issues.push({ path, message: `duplicate node id ${node.id}` });
    nodeIds.add(key);
    const schema = contentSchemas.get(node.type);
    if (schema) {
      const r = schema.safeParse(node.content);
      if (!r.success) for (const i of r.error.issues) issues.push({ path: `${path}.content.${i.path.join(".")}`, message: i.message });
    }
  });

  const checkNav = (items: NavItem[], path: string) =>
    items.forEach((it, i) => {
      const t = it.target;
      if (t && (t.kind === "page" || t.kind === "section")) {
        const page = pageIds.get(t.pageId);
        if (!page) issues.push({ path: `${path}[${i}].target`, message: "links to a page that does not exist" });
        else if (t.kind === "section" && !page.sections.some((s) => s.id === t.sectionId))
          issues.push({ path: `${path}[${i}].target`, message: "links to a section that does not exist" });
      }
      if (it.children) checkNav(it.children, `${path}[${i}].children`);
    });
  checkNav(site.nav.items, "nav.items");

  for (const r of site.redirects) {
    if (slugs.has(r.from)) issues.push({ path: "redirects", message: `redirect from ${r.from} shadows a live page` });
  }
  return issues.length ? { ok: false, issues } : { ok: true, site };
}

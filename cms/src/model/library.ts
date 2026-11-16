import { newId, type Node, type Page, type Section, type Site, type Template } from "../schema";
import { addSection, locate, updateNode } from "./page-ops";

/** Global components ("symbols") and templates. Pure functions over the site. */

const eachPage = (site: Site, fn: (p: Page) => Page): Site => {
  let changed = false;
  const pages = site.pages.map((p) => {
    const next = fn(p);
    if (next !== p) changed = true;
    return next;
  });
  return changed ? { ...site, pages } : site;
};

/** Turn a node into a global component: it moves to site.globals and a reference takes its place. */
export function makeGlobal(site: Site, pageId: string, nodeId: string, name: string): { site: Site; globalId: string } | null {
  const page = site.pages.find((p) => p.id === pageId);
  const at = page ? locate(page, nodeId) : null;
  if (!page || !at || at.kind === "section" || at.node.type === "Global") return null;
  const globalId = newId("g");
  const { style, ...rest } = at.node;
  // The reference keeps the placement (style); the global keeps the content and its own look.
  const global = { id: globalId, name: name.trim() || "Global component", node: { ...rest, id: newId("n"), style: { base: {} } } };
  const next = eachPage({ ...site, globals: [...site.globals, global] }, (p) =>
    p.id === pageId ? updateNode(p, nodeId, () => ({ id: nodeId, type: "Global", name: at.node.name, content: { globalId }, style })) : p,
  );
  return { site: next, globalId };
}

/** Replace one reference with an independent copy of the global's node. */
export function detachGlobal(site: Site, pageId: string, nodeId: string): Site {
  return eachPage(site, (p) =>
    p.id !== pageId
      ? p
      : updateNode(p, nodeId, (ref) => {
          const g = ref.type === "Global" ? site.globals.find((x) => x.id === ref.content.globalId) : undefined;
          return g ? { ...structuredClone(g.node), id: ref.id, name: ref.name ?? g.name, style: ref.style } : ref;
        }),
  );
}

export function updateGlobal(site: Site, globalId: string, fn: (node: Node) => Node, name?: string): Site {
  return { ...site, globals: site.globals.map((g) => (g.id === globalId ? { ...g, name: name ?? g.name, node: fn(g.node) } : g)) };
}

/** How many places use a global, across all pages. */
export function globalUses(site: Site, globalId: string): number {
  const inSections = (sections: Section[]) => sections.reduce((n, s) => n + s.children.filter((c) => c.type === "Global" && c.content.globalId === globalId).length, 0);
  return site.pages.reduce((n, p) => n + inSections(p.sections) + p.overlays.filter((o) => o.node.type === "Global" && o.node.content.globalId === globalId).length, 0);
}

/** Delete a global. Every reference becomes its own copy first, so no page loses content. */
export function removeGlobal(site: Site, globalId: string): Site {
  const g = site.globals.find((x) => x.id === globalId);
  if (!g) return site;
  const swap = (n: Node): Node => (n.type === "Global" && n.content.globalId === globalId ? { ...structuredClone(g.node), id: n.id, name: n.name ?? g.name, style: n.style } : n);
  const pages = site.pages.map((p) => ({
    ...p,
    sections: p.sections.map((s) => ({ ...s, children: s.children.map(swap) })),
    overlays: p.overlays.map((o) => ({ ...o, node: swap(o.node) })),
  }));
  return { ...site, pages, globals: site.globals.filter((x) => x.id !== globalId) };
}

// ------------------------------------------------------------ templates

/** Copy sections with fresh ids, ready to drop into a page. */
export function instantiate(sections: Section[]): Section[] {
  return sections.map((s) => ({ ...structuredClone(s), id: newId("s"), children: s.children.map((n) => ({ ...structuredClone(n), id: newId("n") })) }));
}

export function saveTemplate(site: Site, kind: Template["kind"], name: string, sections: Section[]): { site: Site; templateId: string } {
  const templateId = newId("t");
  const template: Template = { id: templateId, name: name.trim() || (kind === "page" ? "Page template" : "Section template"), kind, sections: instantiate(sections) };
  return { site: { ...site, templates: [...site.templates, template] }, templateId };
}

export function removeTemplate(site: Site, templateId: string): Site {
  return { ...site, templates: site.templates.filter((t) => t.id !== templateId) };
}

/** Insert a template's sections into a page (at the end unless an index is given). */
export function insertTemplate(site: Site, pageId: string, templateId: string, index?: number): Site {
  const template = site.templates.find((t) => t.id === templateId);
  if (!template) return site;
  return eachPage(site, (p) => {
    if (p.id !== pageId) return p;
    let page = p;
    instantiate(template.sections).forEach((s, i) => {
      page = addSection(page, s, index === undefined ? undefined : index + i);
    });
    return page;
  });
}

/** The four built-in starters can't be deleted. */
export const STARTER_TEMPLATES = ["blank", "gallery", "diary", "playlist"];

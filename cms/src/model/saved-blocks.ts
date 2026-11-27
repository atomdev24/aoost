import { newId, type Node, type Site, type Style, type Template } from "../schema";
import { createSection } from "./page-ops";

/*
 * Saved blocks and block defaults, kept in the site's templates (so they sync and are saved like
 * section templates, with nothing new to store):
 *   kind "block":   one block exactly as it was saved (Insert → Saved), to add again any time;
 *   kind "default": how every new block of one type starts (its name is the type).
 * Each holds a single section with the one block in it.
 */

const holding = (node: Node): Template["sections"] => [createSection("flow", { children: [(({ locked: _l, ...rest }) => structuredClone(rest))(node) as Node] })];
const nodeOf = (t: Template): Node | null => t.sections[0]?.children[0] ?? null;

export const savedBlocks = (site: Site) => site.templates.filter((t) => t.kind === "block" && nodeOf(t));

/** Save a block as it is now, under a name; returns the saved block's id. */
export function saveBlock(site: Site, node: Node, name: string): { site: Site; id: string } {
  const id = newId("t");
  const t: Template = { id, name: name.trim() || node.name || node.type, kind: "block", sections: holding(node) };
  return { site: { ...site, templates: [...site.templates, t] }, id };
}

export function renameSaved(site: Site, id: string, name: string): Site {
  const clean = name.trim();
  if (!clean) return site;
  return { ...site, templates: site.templates.map((t) => (t.id === id ? { ...t, name: clean } : t)) };
}

/** A copy next to the original, called "… copy". */
export function duplicateSaved(site: Site, id: string): { site: Site; id: string } {
  const i = site.templates.findIndex((t) => t.id === id);
  if (i < 0) return { site, id };
  const copyId = newId("t");
  const src = site.templates[i]!;
  const copy: Template = { ...structuredClone(src), id: copyId, name: `${src.name} copy` };
  const templates = [...site.templates];
  templates.splice(i + 1, 0, copy);
  return { site: { ...site, templates }, id: copyId };
}

/** A fresh block from a saved one (new id), to add to a page. */
export function blockFromSaved(site: Site, id: string): Node | null {
  const t = site.templates.find((x) => x.id === id && x.kind === "block");
  const n = t ? nodeOf(t) : null;
  return n ? { ...structuredClone(n), id: newId("n") } : null;
}

/** New blocks of this block's type start like it from now on (replacing any earlier default). */
export function setBlockDefault(site: Site, node: Node): Site {
  const rest = site.templates.filter((t) => !(t.kind === "default" && t.name === node.type));
  return { ...site, templates: [...rest, { id: newId("t"), name: node.type, kind: "default", sections: holding(node) }] };
}

/** Back to the block's built-in starting point. */
export function clearBlockDefault(site: Site, type: string): Site {
  return { ...site, templates: site.templates.filter((t) => !(t.kind === "default" && t.name === type)) };
}

/** What a new block of this type starts with on this site, if a default was set. */
export function blockDefault(site: Site, type: string): { content: Record<string, unknown>; style?: Style } | null {
  const t = site.templates.find((x) => x.kind === "default" && x.name === type);
  const n = t ? nodeOf(t) : null;
  if (!n) return null;
  const base = (n.style as { base?: Style } | undefined)?.base;
  return { content: structuredClone(n.content) as Record<string, unknown>, ...(base ? { style: structuredClone(base) } : {}) };
}

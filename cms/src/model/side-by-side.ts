import type { Node, Page, Section } from "../schema";
import { createSection, locate, remove } from "./page-ops";

/**
 * Put a block beside another: dropped on the left or right edge of a block in a stacked section,
 * the section splits around the target and the two share a two-column row (stacked on phones).
 * In a grid that already has two or more columns on desktop, the block just goes next to the
 * target. `moving` is a block already on the page (by id) or a new one.
 */
export function placeBeside(page: Page, targetId: string, moving: string | Node, side: "left" | "right"): Page {
  let node: Node | null = typeof moving === "string" ? null : moving;
  let p = page;
  if (typeof moving === "string") {
    if (moving === targetId) return page;
    const at = locate(page, moving);
    if (at?.kind !== "node") return page;
    node = at.node;
    p = remove(page, moving);
  }
  const at = locate(p, targetId);
  if (!node || at?.kind !== "node" || at.section.kind === "canvas") return page;
  const s = at.section;
  const i = s.children.findIndex((n) => n.id === targetId);
  const pair = side === "left" ? [node, at.node] : [at.node, node];

  if (s.kind === "grid" && (s.layout.desktop?.columns ?? s.layout.base.columns) >= 2) {
    const children = [...s.children];
    children.splice(side === "left" ? i : i + 1, 0, node);
    return { ...p, sections: p.sections.map((x) => (x.id === s.id ? { ...x, children } : x)) };
  }

  const before = s.children.slice(0, i);
  const after = s.children.slice(i + 1);
  // The row keeps the section's look (padding, width, background) with two columns from tablet up.
  const row: Section = createSection("grid", {
    layout: { ...s.layout, base: { ...s.layout.base, columns: 1, gap: Math.max(s.layout.base.gap, 24) }, desktop: { ...s.layout.desktop, columns: 2 }, tablet: { ...s.layout.tablet, columns: 2 } },
    children: pair,
  });
  const pieces: Section[] = [];
  if (before.length) pieces.push({ ...s, children: before });
  pieces.push(before.length ? row : { ...row, id: s.id, name: s.name });
  if (after.length) pieces.push({ ...createSection(s.kind), layout: s.layout, children: after });
  const index = p.sections.findIndex((x) => x.id === s.id);
  const sections = [...p.sections];
  sections.splice(index, 1, ...pieces);
  return { ...p, sections };
}

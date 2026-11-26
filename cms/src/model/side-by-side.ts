import type { Node, Page, Section } from "../schema";
import { createSection, locate, remove } from "./page-ops";

/**
 * Put a block beside another: dropped on the left or right edge of a block in a stacked section,
 * the section splits around the target and the two share a two-column row (stacked on phones).
 * In a grid that already has two or more columns on desktop, the block just goes next to the
 * target. `moving` is a block already on the page (by id) or a new one.
 */
export function placeBeside(page: Page, targetId: string, moving: string | Node, side: "left" | "right", opts: { share?: number } = {}): Page {
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

  if (s.stacks) return besideInStacks(p, s, at.node, node, side);
  if (s.kind === "grid" && (s.layout.desktop?.columns ?? s.layout.base.columns) >= 2) {
    const children = [...s.children];
    children.splice(side === "left" ? i : i + 1, 0, node);
    return { ...p, sections: p.sections.map((x) => (x.id === s.id ? { ...x, children } : x)) };
  }

  const before = s.children.slice(0, i);
  const after = s.children.slice(i + 1);
  // The target keeps the width it had (its share of the section); the new block takes the rest.
  // (A block that already fills the width has no room beside it: the two share it evenly.)
  const share = opts.share && opts.share < 0.85 ? Math.round(Math.max(20, Math.min(80, opts.share * 100))) : 50;
  const colWidths = side === "left" ? [100 - share, share] : [share, 100 - share];
  if (opts.share) {
    const full = (n: Node): Node => ({ ...n, style: { ...n.style, desktop: { ...n.style.desktop, width: "100%", maxWidth: undefined }, tablet: { ...n.style.tablet, width: "100%", maxWidth: undefined } } });
    pair[side === "left" ? 1 : 0] = full(at.node);
  }
  // The row keeps the section's look (padding, width, background) with two columns from tablet up.
  // Each side is a column stack: more blocks can go above or below in either column later.
  const row: Section = createSection("grid", {
    layout: { ...s.layout, base: { ...s.layout.base, columns: 1, gap: Math.max(s.layout.base.gap, 24) }, desktop: { ...s.layout.desktop, columns: 2, colWidths }, tablet: { ...s.layout.tablet, columns: 2, colWidths } },
    stacks: 2,
    children: pair.map((n, col) => ({ ...n, col })),
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

/**
 * Beside a block in a row of column stacks: into the column on that side, level with the target;
 * past the last column a new column opens (up to four), sharing the width.
 */
function besideInStacks(page: Page, s: Section, target: Node, node: Node, side: "left" | "right"): Page {
  const n = s.stacks!;
  const tcol = Math.min(n - 1, target.col ?? 0);
  const col = side === "left" ? tcol - 1 : tcol + 1;
  let section = s;
  let into = col;
  if (col < 0 || col >= n) {
    if (n >= 4) return page;
    // A new column on that side: the others keep their share of the rest.
    const was: number[] = s.layout.desktop?.colWidths ?? Array.from({ length: n }, () => 100 / n);
    const widths = was.map((w) => (w * n) / (n + 1));
    const fresh = 100 / (n + 1);
    const colWidths = col < 0 ? [fresh, ...widths] : [...widths, fresh];
    const shift = col < 0 ? 1 : 0;
    into = col < 0 ? 0 : n;
    section = {
      ...s,
      stacks: n + 1,
      layout: { ...s.layout, desktop: { ...s.layout.desktop, columns: n + 1, colWidths }, tablet: { ...s.layout.tablet, columns: n + 1, colWidths } },
      children: s.children.map((c) => ({ ...c, col: Math.min(n - 1, c.col ?? 0) + shift })),
    };
  }
  // Level with the target: at the same place in the new column as the target has in its own.
  const kids = section.children;
  const rank = kids.filter((c) => (c.col ?? 0) === (section === s ? tcol : tcol + (col < 0 ? 1 : 0))).findIndex((c) => c.id === target.id);
  const inCol = kids.filter((c) => (c.col ?? 0) === into);
  const before = inCol[Math.max(0, rank)];
  const children = [...kids];
  const at = before ? children.indexOf(before) : inCol.length ? children.indexOf(inCol[inCol.length - 1]!) + 1 : children.length;
  children.splice(at, 0, { ...node, col: into });
  return { ...page, sections: page.sections.map((x) => (x.id === s.id ? { ...section, children } : x)) };
}

/** Where a block goes relative to another: above, below, or beside it. */
export type Placement = "before" | "after" | "left" | "right";

/**
 * Put a block above, below or beside another. Above and below keep it in the same section and, in
 * a row of column stacks, in the same column; beside works as placeBeside.
 */
export function placeNear(page: Page, targetId: string, moving: string | Node, where: Placement, opts: { share?: number } = {}): Page {
  if (where === "left" || where === "right") return placeBeside(page, targetId, moving, where, opts);
  let node: Node | null = typeof moving === "string" ? null : moving;
  let p = page;
  if (typeof moving === "string") {
    if (moving === targetId) return page;
    const from = locate(page, moving);
    if (from?.kind !== "node") return page;
    node = from.node;
    p = remove(page, moving);
  }
  const at = locate(p, targetId);
  if (!node || at?.kind !== "node") return page;
  const s = at.section;
  const placed: Node = s.stacks ? { ...node, col: Math.min(s.stacks - 1, at.node.col ?? 0) } : { ...node, col: undefined };
  const children = [...s.children];
  const i = children.findIndex((n) => n.id === targetId);
  children.splice(where === "before" ? i : i + 1, 0, placed);
  return { ...p, sections: p.sections.map((x) => (x.id === s.id ? { ...x, children } : x)) };
}

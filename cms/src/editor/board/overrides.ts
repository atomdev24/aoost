import { overridesAt, resetAt } from "../../responsive/resolve";
import type { Breakpoint, Node, Page } from "../../schema";
import { nodeSlots, withSlotFrame, withSlotSize } from "../canvas/slots";

/**
 * Per-size changes, counted and reset. Each size is compared with the size the
 * editor shows it against (resolve.ts REFERENCE): mobile with desktop, tablet
 * with mobile, widescreen with desktop. Desktop is the reference and has none.
 */

/** A block's own values that differ at a size: layout and look, its frame, and the frames of pictures inside it. */
function nodeOverrides(node: Node, bp: Breakpoint): number {
  let n = overridesAt(node.style, bp).length + (node.frame ? overridesAt(node.frame, bp).length : 0);
  for (const s of nodeSlots(node)) {
    if (s.frame) n += overridesAt(s.frame, bp).length;
    if (s.size) n += overridesAt(s.size, bp).length;
  }
  return n;
}

/** The block with every difference at this size reset to the size it is compared with. */
function resetNode(node: Node, bp: Breakpoint): Node {
  let next: Node = { ...node, style: resetAt(node.style, bp), ...(node.frame ? { frame: resetAt(node.frame, bp) } : {}) };
  for (const s of nodeSlots(node)) {
    if (s.frame && overridesAt(s.frame, bp).length) next = withSlotFrame(next, s.path, resetAt(s.frame, bp));
    if (s.size && overridesAt(s.size, bp).length) next = withSlotSize(next, s.path, resetAt(s.size, bp));
  }
  return next;
}

/** How many values on the page differ at a size (the "N overrides" badge on its frame). */
export function countOverrides(page: Page, bp: Breakpoint): number {
  let n = 0;
  for (const s of page.sections) {
    n += overridesAt(s.layout, bp).length;
    for (const node of s.children) n += nodeOverrides(node, bp);
  }
  for (const o of page.overlays) n += overridesAt(o.node.style, bp).length + overridesAt(o.place, bp).length;
  return n;
}

/** How many values on the page differ on mobile from desktop. */
export const countMobileOverrides = (page: Page) => countOverrides(page, "mobile");

/** The values one block (or section, or overlay) changes at a size. */
export function blockOverrides(page: Page, id: string, bp: Breakpoint = "mobile"): number {
  const s = page.sections.find((x) => x.id === id);
  if (s) return overridesAt(s.layout, bp).length;
  const o = page.overlays.find((x) => x.id === id);
  if (o) return overridesAt(o.node.style, bp).length + overridesAt(o.place, bp).length;
  for (const sec of page.sections) {
    const n = sec.children.find((x) => x.id === id);
    if (n) return nodeOverrides(n, bp);
  }
  return 0;
}

/** "Reset all": the block takes the reference size's values again at this size (every override removed). */
export function resetBlockOverrides(page: Page, id: string, bp: Breakpoint = "mobile"): Page {
  if (page.sections.some((x) => x.id === id)) return { ...page, sections: page.sections.map((s) => (s.id === id ? { ...s, layout: resetAt(s.layout, bp) } : s)) };
  if (page.overlays.some((x) => x.id === id))
    return { ...page, overlays: page.overlays.map((o) => (o.id === id ? { ...o, place: resetAt(o.place, bp), node: { ...o.node, style: resetAt(o.node.style, bp) } } : o)) };
  return {
    ...page,
    sections: page.sections.map((s) => (!s.children.some((n) => n.id === id) ? s : { ...s, children: s.children.map((n) => (n.id !== id ? n : resetNode(n, bp))) })),
  };
}

/** The sections and blocks that have their own values at this size (marked orange on the board). */
export function overriddenIds(page: Page, bp: Breakpoint): string[] {
  if (bp === "desktop") return [];
  const ids: string[] = [];
  for (const s of page.sections) {
    if (overridesAt(s.layout, bp).length) ids.push(s.id);
    for (const node of s.children) if (nodeOverrides(node, bp)) ids.push(node.id);
  }
  return ids;
}

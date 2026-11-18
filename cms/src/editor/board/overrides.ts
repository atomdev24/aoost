import { overriddenKeys, resetToDesktop } from "../../responsive/resolve";
import type { Node, Page } from "../../schema";
import { nodeSlots, withSlotFrame } from "../canvas/slots";

/** A block's own values that differ on mobile: layout and look, its frame, and the frames of pictures inside it. */
function nodeOverrides(node: Node): number {
  let n = overriddenKeys(node.style).length + (node.frame ? overriddenKeys(node.frame).length : 0);
  for (const s of nodeSlots(node)) if (s.frame) n += overriddenKeys(s.frame).length;
  return n;
}

/** The block with every mobile difference reset to desktop's value. */
function resetNode(node: Node): Node {
  let next: Node = { ...node, style: resetToDesktop(node.style), ...(node.frame ? { frame: resetToDesktop(node.frame) } : {}) };
  for (const s of nodeSlots(node)) if (s.frame && overriddenKeys(s.frame).length) next = withSlotFrame(next, s.path, resetToDesktop(s.frame));
  return next;
}

/** How many values on the page differ on mobile from desktop (the "N overrides" on the Mobile frame). */
export function countMobileOverrides(page: Page): number {
  let n = 0;
  for (const s of page.sections) {
    n += overriddenKeys(s.layout).length;
    for (const node of s.children) n += nodeOverrides(node);
  }
  for (const o of page.overlays) n += overriddenKeys(o.node.style).length + overriddenKeys(o.place).length;
  return n;
}

/** The values one block (or section, or overlay) changes on mobile. */
export function blockOverrides(page: Page, id: string): number {
  const s = page.sections.find((x) => x.id === id);
  if (s) return overriddenKeys(s.layout).length;
  const o = page.overlays.find((x) => x.id === id);
  if (o) return overriddenKeys(o.node.style).length + overriddenKeys(o.place).length;
  for (const sec of page.sections) {
    const n = sec.children.find((x) => x.id === id);
    if (n) return nodeOverrides(n);
  }
  return 0;
}

/** "Reset all": the block takes desktop's values on mobile again (every override removed). */
export function resetBlockOverrides(page: Page, id: string): Page {
  if (page.sections.some((x) => x.id === id)) return { ...page, sections: page.sections.map((s) => (s.id === id ? { ...s, layout: resetToDesktop(s.layout) } : s)) };
  if (page.overlays.some((x) => x.id === id))
    return { ...page, overlays: page.overlays.map((o) => (o.id === id ? { ...o, place: resetToDesktop(o.place), node: { ...o.node, style: resetToDesktop(o.node.style) } } : o)) };
  return {
    ...page,
    sections: page.sections.map((s) => (!s.children.some((n) => n.id === id) ? s : { ...s, children: s.children.map((n) => (n.id !== id ? n : resetNode(n))) })),
  };
}

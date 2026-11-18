import { overriddenKeys, resetToDesktop } from "../../responsive/resolve";
import type { Page } from "../../schema";

/** How many values on the page differ on mobile from desktop (the "N overrides" on the Mobile frame). */
export function countMobileOverrides(page: Page): number {
  let n = 0;
  for (const s of page.sections) {
    n += overriddenKeys(s.layout).length;
    for (const node of s.children) n += overriddenKeys(node.style).length + (node.frame ? overriddenKeys(node.frame).length : 0);
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
    if (n) return overriddenKeys(n.style).length + (n.frame ? overriddenKeys(n.frame).length : 0);
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
    sections: page.sections.map((s) => (!s.children.some((n) => n.id === id) ? s : { ...s, children: s.children.map((n) => (n.id !== id ? n : { ...n, style: resetToDesktop(n.style), ...(n.frame ? { frame: resetToDesktop(n.frame) } : {}) })) })),
  };
}

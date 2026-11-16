import { overriddenKeys } from "../../responsive/resolve";
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

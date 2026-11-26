import type { Section } from "../schema";

/**
 * The layers panel lists the topmost layer first, like Figma. In a free-layout (canvas) section
 * later children paint on top, so the panel shows them reversed. Flow and grid sections read top
 * to bottom on the page, so the panel keeps their order.
 */
export const listsReversed = (s: Pick<Section, "kind">) => s.kind === "canvas";

/** The children of a section in the order the layers panel shows them. */
export function displayChildren<T>(s: Pick<Section, "kind"> & { children: T[] }): T[] {
  return listsReversed(s) ? [...s.children].reverse() : s.children;
}

/**
 * Turn a drop position in the panel (index among the shown rows, with the dragged row left out)
 * into the index moveNode expects (index in the children array, with the dragged node removed).
 */
export function arrayIndexForDrop(s: Pick<Section, "kind">, displayIndex: number, countWithoutDragged: number): number {
  const d = Math.max(0, Math.min(displayIndex, countWithoutDragged));
  return listsReversed(s) ? countWithoutDragged - d : d;
}

/** Moving a row up in the panel means this change to its array index. */
export const arrayDeltaForUp = (s: Pick<Section, "kind">): -1 | 1 => (listsReversed(s) ? 1 : -1);

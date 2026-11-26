import { locate } from "../../model/page-ops";
import type { Placement } from "../../model/side-by-side";
import { currentPage, getState } from "../store";

/**
 * Where a drop at a point in the page frame would go, for things brought in from outside Puck's own
 * drag (references and parked blocks from the board): the block under the point, and whether the
 * point is on its left or right edge (beside), or its top or bottom half (above or below).
 * Free-layout sections place by position instead and give null here.
 */
export type DropHit = { targetId: string; where: Placement; share?: number; rect: DOMRect };

const EDGE = 0.22;

export function dropAt(doc: Document, x: number, y: number, exclude?: string): DropHit | null {
  const page = currentPage(getState());
  for (const el of doc.elementsFromPoint(x, y)) {
    const node = (el as Element).closest?.<HTMLElement>("[data-node-id]");
    const id = node?.dataset.nodeId;
    if (!node || !id || id === exclude) continue;
    const at = locate(page, id);
    if (at?.kind !== "node" || at.section.kind === "canvas") return null;
    const r = node.getBoundingClientRect();
    const rx = (x - r.left) / r.width;
    const ry = (y - r.top) / r.height;
    const inner = node.closest<HTMLElement>(".si");
    const cs = inner ? getComputedStyle(inner) : null;
    const room = inner && cs ? inner.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : 0;
    const where: Placement = rx < EDGE ? "left" : rx > 1 - EDGE ? "right" : ry < 0.5 ? "before" : "after";
    return { targetId: id, where, share: room ? r.width / room : undefined, rect: r };
  }
  return null;
}

/** The blue line that shows where a drop will go (a bar on the side for beside, a line above or below). */
export function showDropBar(doc: Document, hit: DropHit | null) {
  let bar = doc.querySelector<HTMLElement>(".ed-drop-bar");
  if (!hit) return void bar?.remove();
  if (!bar) {
    bar = doc.createElement("div");
    bar.className = "ed-drop-bar";
    doc.body.appendChild(bar);
  }
  const r = hit.rect;
  const top = r.top + doc.documentElement.scrollTop;
  const side = hit.where === "left" || hit.where === "right";
  bar.dataset.where = hit.where;
  bar.textContent = side ? "Side by side" : hit.where === "before" ? "Above" : "Below";
  Object.assign(
    bar.style,
    side
      ? { left: `${hit.where === "left" ? r.left - 3 : r.right - 3}px`, top: `${top}px`, width: "", height: `${r.height}px` }
      : { left: `${r.left}px`, top: `${hit.where === "before" ? top - 2 : top + r.height - 2}px`, width: `${r.width}px`, height: "" },
  );
}

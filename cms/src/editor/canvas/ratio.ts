import { getComponent } from "../../components/registry";
import { locate, updateNode } from "../../model/page-ops";
import type { Node } from "../../schema";
import { currentPage, getState, updatePage } from "../store";

/** Whether resizing keeps a block's proportions: pictures and video do unless switched off; other blocks only when switched on. */
export const keepsRatio = (n: Node) => n.style.base.keepRatio ?? (!!getComponent(n.type)?.framed || n.type === "FruitReading");

export function toggleKeepRatio(n: Node) {
  const next = !keepsRatio(n);
  updatePage(getState().pageId, (p) => updateNode(p, n.id, (x) => ({ ...x, style: { ...x.style, base: { ...x.style.base, keepRatio: next } } })), next ? "Keep proportions" : "Free proportions");
}

/**
 * The "Proportions / Free" chip on a selected picture or video. Handled here, on the canvas frame's
 * own document, because a React click handler inside Puck's frame doesn't reliably fire there.
 */
export function attachRatioChip(doc: Document) {
  const click = (e: MouseEvent) => {
    const chip = (e.target as Element | null)?.closest?.("[data-ed-ratio]");
    const id = chip?.closest("[data-node-id]")?.getAttribute("data-node-id");
    if (!chip || !id) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const at = locate(currentPage(getState()), id);
    const node = at?.kind === "node" ? at.node : at?.kind === "overlay" ? at.overlay.node : null;
    if (node) toggleKeepRatio(node);
  };
  doc.addEventListener("click", click, true);
  return () => doc.removeEventListener("click", click, true);
}

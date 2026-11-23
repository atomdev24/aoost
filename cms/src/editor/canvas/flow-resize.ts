import { updateNode } from "../../model/page-ops";
import { resolve, setOnly } from "../../responsive/resolve";
import type { Node, Style } from "../../schema";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage } from "../store";
import { keepsRatio } from "./ratio";

const round = (n: number, d = 10) => Math.round(n * d) / d;

/**
 * Resize a picture (or video) in a stacked or grid section from its corner
 * handle: its width becomes a share of the space it sits in, on the size being
 * edited. It keeps its proportions (Shift, or "Free", lets the height follow
 * the pointer and stores the new proportions).
 */
export function attachFlowResize(doc: Document) {
  const down = (e: PointerEvent) => {
    const handle = (e.target as Element | null)?.closest?.("[data-ed-flow-handle]");
    const el = handle?.closest<HTMLElement>("[data-node-id]");
    const id = el?.dataset.nodeId;
    if (!handle || !el || !id || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const page = currentPage(getState());
    const node = page.sections.flatMap((s) => s.children).find((n) => n.id === id);
    if (!node) return;
    const box = el.getBoundingClientRect();
    const cell = el.parentElement!.getBoundingClientRect();
    const cs = getComputedStyle(el.parentElement!);
    const room = cell.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const free0 = !keepsRatio(node);
    const start = { x: e.clientX, y: e.clientY };
    let w = box.width;
    let h = box.height;
    let moved = false;
    const move = (m: PointerEvent) => {
      moved = true;
      w = Math.max(24, Math.min(room, box.width + (m.clientX - start.x)));
      const free = free0 !== m.shiftKey;
      h = free ? Math.max(24, box.height + (m.clientY - start.y)) : (w * box.height) / box.width;
      el.style.width = `${w}px`;
      el.style.maxWidth = "none";
      if (free) el.style.aspectRatio = `${w}/${h}`;
    };
    const up = () => {
      doc.removeEventListener("pointermove", move, true);
      doc.removeEventListener("pointerup", up, true);
      if (!moved) return;
      const { bp } = getState();
      const shown = resolve(node.style, bp) as Style;
      const patch: Partial<Style> = { width: `${round((w / room) * 100)}%`, maxWidth: undefined };
      // Height follows the width through the proportions (kept, or the new ones when resized freely).
      patch.aspectRatio = free0 || !shown.aspectRatio ? `${Math.round(w)}/${Math.round(h)}` : shown.aspectRatio;
      if (shown.height) patch.height = undefined;
      updatePage(getState().pageId, (p) => updateNode(p, id, (n: Node) => ({ ...n, style: setOnly(n.style, bp, patch) })), "Resize picture");
      setTimeout(() => ["width", "maxWidth", "aspectRatio"].forEach((k) => el.style.removeProperty(k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()))), 80);
      selectBlock(id);
      doc.addEventListener("click", (c) => c.stopPropagation(), { capture: true, once: true });
    };
    doc.addEventListener("pointermove", move, true);
    doc.addEventListener("pointerup", up, true);
  };
  doc.addEventListener("pointerdown", down, true);
  return () => doc.removeEventListener("pointerdown", down, true);
}

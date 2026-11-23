import { locate, updateNode } from "../../model/page-ops";
import { labelScale, NEW_MARK, type Mark } from "../../components/Image/annotations";
import type { Node } from "../../schema";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage } from "../store";

/** What the Insert panel's "Fruit reading" card carries when it is dragged onto a picture. */
export const ANNOTATION_MIME = "application/x-aoost-annotation";

const imageNode = (id: string): Node | null => {
  const at = locate(currentPage(getState()), id);
  const n = at?.kind === "node" ? at.node : at?.kind === "overlay" ? at.overlay.node : null;
  return n?.type === "Image" ? n : null;
};
const pct = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;

/** Where a point sits in an Image block's frame, in percent. */
export function framePoint(blockEl: Element, clientX: number, clientY: number) {
  const r = (blockEl.querySelector(".frame") ?? blockEl).getBoundingClientRect();
  return { x: pct(((clientX - r.left) / r.width) * 100), y: pct(((clientY - r.top) / r.height) * 100) };
}

/** Add a fruit reading to an Image block (at a point in its frame, or the middle). One undo step. */
export function addMark(id: string, at?: { x: number; y: number }) {
  const node = imageNode(id);
  if (!node) return false;
  const marks = (node.content.marks as Mark[] | undefined) ?? [];
  const mark: Mark = { ...NEW_MARK, ...(at ?? { x: 50 + marks.length * 6, y: 50 }), side: (at?.x ?? 50) > 70 ? "left" : "right" };
  updatePage(getState().pageId, (p) => updateNode(p, id, (n) => ({ ...n, content: { ...n.content, marks: [...marks, mark] } })), "Add fruit reading");
  selectBlock(id);
  return true;
}

/** Drag a ring's handle: the ring grows or shrinks around its centre (and its label with it, when labels scale). */
function resizeRing(e: PointerEvent): boolean {
  const h = (e.target as Element | null)?.closest?.("[data-ann-h]");
  const markEl = h?.closest<HTMLElement>(".ann-m[data-ann-i]");
  const block = markEl?.closest("[data-node-id]");
  const id = block?.getAttribute("data-node-id");
  if (!h || !markEl || !block || !id || e.button !== 0) return false;
  e.preventDefault();
  e.stopPropagation();
  const doc = markEl.ownerDocument;
  const i = Number(markEl.dataset.annI);
  const node = imageNode(id);
  const grow = node?.content.markLabels === "scale";
  const frame = (block.querySelector(".frame") ?? block).getBoundingClientRect();
  const c = markEl.getBoundingClientRect();
  const cx = c.left + c.width / 2;
  const cy = c.top + c.height / 2;
  let r: number | null = null;
  const move = (m: PointerEvent) => {
    r = Math.round(Math.min(40, Math.max(1, (Math.hypot(m.clientX - cx, m.clientY - cy) / frame.width) * 100)) * 10) / 10;
    markEl.style.setProperty("--r", `${r}cqw`);
    if (grow) markEl.style.setProperty("--ls", String(labelScale(r, true)));
  };
  const up = () => {
    doc.removeEventListener("pointermove", move, true);
    doc.removeEventListener("pointerup", up, true);
    if (r === null) return;
    const to = r;
    updatePage(getState().pageId, (p) => updateNode(p, id, (n) => ({ ...n, content: { ...n.content, marks: ((n.content.marks as Mark[]) ?? []).map((mk, j) => (j === i ? { ...mk, r: to } : mk)) } })), "Resize fruit reading");
    selectBlock(id);
    doc.addEventListener("click", (k) => k.stopPropagation(), { capture: true, once: true });
  };
  doc.addEventListener("pointermove", move, true);
  doc.addEventListener("pointerup", up, true);
  return true;
}

/** Drag a fruit reading's mark around its picture in the canvas (one undo step per drag). */
export function attachAnnotationDrag(doc: Document) {
  const down = (e: PointerEvent) => {
    if (resizeRing(e)) return;
    const markEl = (e.target as Element | null)?.closest?.<HTMLElement>(".ann-m[data-ann-i]");
    const block = markEl?.closest("[data-node-id]");
    const id = block?.getAttribute("data-node-id");
    if (!markEl || !block || !id || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const i = Number(markEl.dataset.annI);
    let last: { x: number; y: number } | null = null;
    const move = (m: PointerEvent) => {
      last = framePoint(block, m.clientX, m.clientY);
      markEl.style.left = `${last.x}%`;
      markEl.style.top = `${last.y}%`;
    };
    const up = () => {
      doc.removeEventListener("pointermove", move, true);
      doc.removeEventListener("pointerup", up, true);
      if (!last) return selectBlock(id);
      const to = last;
      updatePage(getState().pageId, (p) => updateNode(p, id, (n) => ({ ...n, content: { ...n.content, marks: ((n.content.marks as Mark[]) ?? []).map((mk, j) => (j === i ? { ...mk, ...to } : mk)) } })), "Move fruit reading");
      selectBlock(id);
    };
    doc.addEventListener("pointermove", move, true);
    doc.addEventListener("pointerup", up, true);
  };
  doc.addEventListener("pointerdown", down, true);
  return () => doc.removeEventListener("pointerdown", down, true);
}

import { addNode, createNode, locate, updateNode } from "../../model/page-ops";
import { canvasSize } from "../../responsive/canvas";
import type { Section } from "../../schema";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage } from "../store";
import { setLayerBoxes } from "./actions";
import { contentRect } from "./annotations";

const frameDoc = () => document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument ?? null;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The picture (Image block) under a point of the canvas, topmost first, and the point on its content in percent. */
export function pictureAt(doc: Document, x: number, y: number, except = ""): { id: string; el: HTMLElement; x: number; y: number } | null {
  // By position, not by what takes clicks: a locked picture ignores the pointer but still anchors readings.
  const under = [...doc.querySelectorAll<HTMLElement>('.n[data-type="Image"]')]
    .filter((n) => n.dataset.nodeId && n.dataset.nodeId !== except)
    .map((n, i) => ({ n, i, r: n.getBoundingClientRect(), z: Number(getComputedStyle(n).zIndex) || 0 }))
    .filter(({ r }) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
    .sort((a, b) => b.z - a.z || b.i - a.i);
  const top = under[0];
  if (!top) return null;
  const r = contentRect(top.n);
  if (!r.width || !r.height) return null;
  return { id: top.n.dataset.nodeId!, el: top.n, x: r1(((x - r.left) / r.width) * 100), y: r1(((y - r.top) / r.height) * 100) };
}

/**
 * After a fruit reading layer is placed, moved or resized: anchor it to the
 * spot of the picture under its centre (or let it go when there's none).
 */
export function reanchor(ids: string[]) {
  const doc = frameDoc();
  if (!doc) return;
  const page = currentPage(getState());
  for (const id of ids) {
    const at = locate(page, id);
    if (at?.kind !== "node" || at.node.type !== "FruitReading") continue;
    const el = doc.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`);
    if (!el) continue;
    el.style.removeProperty("translate");
    const r = el.getBoundingClientRect();
    const found = pictureAt(doc, r.left + r.width / 2, r.top + r.height / 2, id);
    const hit = found ? { id: found.id, x: found.x, y: found.y } : null;
    const now = at.node.content.anchor as { id: string; x: number; y: number } | undefined;
    if (JSON.stringify(now ?? null) === JSON.stringify(hit)) continue;
    updatePage(getState().pageId, (p) => updateNode(p, id, (n) => ({ ...n, content: { ...n.content, anchor: hit ?? undefined } })), "Anchor fruit reading", { merge: `anchor-${id}` });
  }
}

/** Click "Fruit reading" with a picture in a free-layout section selected: a reading layer in the middle of it. */
export function addReadingOnPicture(id: string): boolean {
  const doc = frameDoc();
  const at = locate(currentPage(getState()), id);
  const el = doc?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`);
  if (!el || at?.kind !== "node" || at.section.kind !== "canvas" || at.node.type !== "Image") return false;
  const r = el.getBoundingClientRect();
  return !!addReadingLayer(at.section, el, r.left + r.width / 2, r.top + r.height / 2);
}

/** A fruit reading layer dropped (or clicked in) over a picture in a free-layout section, centred on the point. */
export function addReadingLayer(section: Section, pictureEl: Element, clientX: number, clientY: number) {
  const si = pictureEl.closest(".si");
  if (!si) return null;
  const { bp } = getState();
  const art = canvasSize(section, bp);
  const s = si.getBoundingClientRect();
  const scale = s.width / art.width;
  const size = 96;
  const x = r1((clientX - s.left) / scale - size / 2);
  const y = r1((clientY - s.top) / scale - size / 2);
  const z = Math.max(0, ...section.children.map((n) => (n.style.base.z ?? 0) as number), ...section.children.map((n) => (n.style.desktop?.z ?? 0) as number)) + 1;
  const node = createNode("FruitReading");
  updatePage(getState().pageId, (p) => addNode(p, section.id, { ...node, name: "Fruit reading" }), "Add fruit reading", { merge: `add-${node.id}` });
  setLayerBoxes(section.id, { [node.id]: { x, y, w: size, h: size, z } }, "Add fruit reading", `add-${node.id}`);
  selectBlock(node.id);
  setTimeout(() => reanchor([node.id]), 150);
  return node.id;
}

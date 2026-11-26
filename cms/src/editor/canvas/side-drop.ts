import { createNode, locate } from "../../model/page-ops";
import { placeBeside } from "../../model/side-by-side";
import { selectBlock } from "../board/bridge";
import { framePointAt } from "../board/ref-page";
import { amendLast, currentPage, getState, updatePage } from "../store";

/**
 * Side by side: while a block (from the page, or a new one from the Add panel) is dragged over the
 * left or right edge of a block in a stacked or grid section, a blue bar shows on that edge; let
 * go there and the two sit next to each other (model/side-by-side.ts). Elsewhere Puck's own drag
 * does what it always does.
 */
type Source = { kind: "node"; id: string } | { kind: "new"; type: string };
type Hit = { targetId: string; side: "left" | "right" };

const EDGE = 0.22;
const ids = (page: { sections: { children: { id: string }[] }[] }) => page.sections.flatMap((s) => s.children.map((n) => n.id));

export function attachSideDrop(doc: Document) {
  let source: Source | null = null;
  let start = { x: 0, y: 0 };
  let hit: Hit | null = null;
  let bar: HTMLElement | null = null;

  const show = (h: Hit | null, rect?: DOMRect) => {
    hit = h;
    if (!h || !rect) {
      bar?.remove();
      bar = null;
      return;
    }
    if (!bar) {
      bar = doc.createElement("div");
      bar.className = "ed-side-bar";
      bar.innerHTML = "<span>Side by side</span>";
      doc.body.appendChild(bar);
    }
    const x = h.side === "left" ? rect.left - 3 : rect.right - 3;
    Object.assign(bar.style, { left: `${x}px`, top: `${rect.top + doc.documentElement.scrollTop}px`, height: `${rect.height}px` });
    bar.dataset.side = h.side;
  };

  /** The block under a point in the frame, and which edge (if any) the point is on. */
  const probe = (x: number, y: number) => {
    const dragged = source?.kind === "node" ? source.id : null;
    const page = currentPage(getState());
    for (const el of doc.elementsFromPoint(x, y)) {
      const node = (el as Element).closest?.<HTMLElement>("[data-node-id]");
      const id = node?.dataset.nodeId;
      if (!node || !id || id === dragged) continue;
      const at = locate(page, id);
      if (at?.kind !== "node" || at.section.kind === "canvas") return show(null);
      // only blocks that sit straight in the section (not inside a block's own content)
      const r = node.getBoundingClientRect();
      const rel = (x - r.left) / r.width;
      return show(rel < EDGE ? { targetId: id, side: "left" } : rel > 1 - EDGE ? { targetId: id, side: "right" } : null, r);
    }
    show(null);
  };

  const finish = () => {
    const s = source;
    const h = hit;
    source = null;
    show(null);
    if (!s || !h) return;
    // Puck finishes its own drop first (in the gap it opened, or a new block where it was let go);
    // then the block moves beside the target, in the same undo step.
    const before = getState().past.length;
    const known = new Set(ids(currentPage(getState())));
    setTimeout(() => {
      const state = getState();
      const page = currentPage(state);
      const added = s.kind === "new" ? ids(page).find((id) => !known.has(id)) : undefined;
      const moving = s.kind === "node" ? s.id : (added ?? createNode(s.type));
      const next = placeBeside(page, h.targetId, moving, h.side);
      if (next === page) return;
      const apply = (site: typeof state.site) => ({ ...site, pages: site.pages.map((p) => (p.id === page.id ? next : p)) });
      if (state.past.length > before) amendLast(apply, "Place side by side");
      else updatePage(page.id, () => next, "Place side by side");
      selectBlock(typeof moving === "string" ? moving : moving.id);
    }, 120);
  };

  // Blocks dragged inside the page.
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-node-id]");
    const id = el?.dataset.nodeId;
    if (!id || (e.target as Element).closest("[data-ed-handle], [data-ed-flow-handle], [data-ed-ratio], [contenteditable=true]")) return;
    const at = locate(currentPage(getState()), id);
    if (at?.kind !== "node" || at.section.kind === "canvas" || at.node.locked) return;
    source = { kind: "node", id };
    start = { x: e.clientX, y: e.clientY };
  };
  const move = (e: PointerEvent) => {
    if (!source) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
    probe(e.clientX, e.clientY);
  };

  // New blocks dragged from the Add panel (the pointer belongs to the editor's own page then).
  const pdown = (e: PointerEvent) => {
    const card = (e.target as Element | null)?.closest?.<HTMLElement>("[data-insert-type]");
    if (!card || e.button !== 0) return;
    source = { kind: "new", type: card.dataset.insertType! };
    start = { x: e.clientX, y: e.clientY };
  };
  const pmove = (e: PointerEvent) => {
    if (source?.kind !== "new") return;
    const at = framePointAt(e.clientX, e.clientY);
    if (!at || at.doc !== doc) return show(null);
    probe(at.x, at.y);
  };
  const pup = () => {
    if (source?.kind === "new") finish();
  };

  doc.addEventListener("pointerdown", down, true);
  doc.addEventListener("pointermove", move, true);
  doc.addEventListener("pointerup", finish, true);
  document.addEventListener("pointerdown", pdown, true);
  document.addEventListener("pointermove", pmove, true);
  document.addEventListener("pointerup", pup, true);
  return () => {
    show(null);
    doc.removeEventListener("pointerdown", down, true);
    doc.removeEventListener("pointermove", move, true);
    doc.removeEventListener("pointerup", finish, true);
    document.removeEventListener("pointerdown", pdown, true);
    document.removeEventListener("pointermove", pmove, true);
    document.removeEventListener("pointerup", pup, true);
  };
}

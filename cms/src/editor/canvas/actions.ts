import { canvasSize, layerBox, type Box } from "../../responsive/canvas";
import { setAt } from "../../responsive/resolve";
import type { Breakpoint, Node, Page, Section, Style } from "../../schema";
import { duplicate, isHidden, locate, nudgeOrder, remove, setHidden } from "../../model/page-ops";
import { activateBreakpoint, selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage } from "../store";
import { align, distribute, type AlignMode, type Rect } from "./geometry";

export function findCanvas(page: Page, nodeId: string): Section | undefined {
  return page.sections.find((s) => s.kind === "canvas" && s.children.some((n) => n.id === nodeId));
}

/** Write a layer's box at a breakpoint (SPEC §3: x, y, w, h, rotation, z per breakpoint). */
export function withBox(section: Section, node: Node, bp: Breakpoint, patch: Partial<Box>): Node {
  if (bp === "mobile") return { ...node, style: setAt(node.style, "mobile", patch as Partial<Style>) };
  // The first move on another size turns a box derived from mobile (or desktop) into a stored one.
  const { x, y, w, h } = layerBox(section, node, bp);
  return { ...node, style: setAt(node.style, bp, { x, y, w, h, ...patch } as Partial<Style>) };
}

/** Apply new boxes to layers of one canvas section as a single undo step. */
export function setLayerBoxes(sectionId: string, boxes: Record<string, Partial<Box>>, label: string, merge?: string) {
  const { bp, pageId } = getState();
  updatePage(
    pageId,
    (page) => ({
      ...page,
      sections: page.sections.map((s) => (s.id !== sectionId ? s : { ...s, children: s.children.map((n) => (boxes[n.id] ? withBox(s, n, bp, boxes[n.id]!) : n)) })),
    }),
    label,
    { merge },
  );
}

type Layer = Rect & { id: string };
function selectedLayers(): { section: Section; layers: Layer[]; bp: Breakpoint } | null {
  const state = getState();
  const page = currentPage(state);
  const first = state.selection[0];
  const section = first ? findCanvas(page, first) : undefined;
  if (!section) return null;
  const layers = section.children.filter((n) => state.selection.includes(n.id) && !n.locked).map((n) => ({ id: n.id, ...layerBox(section, n, state.bp) }));
  return { section, layers, bp: state.bp };
}

const commit = (section: Section, layers: Layer[], label: string) => setLayerBoxes(section.id, Object.fromEntries(layers.map((l) => [l.id, { x: l.x, y: l.y }])), label);

/** One layer aligns to the artboard; several align to each other. */
export function alignSelection(mode: AlignMode) {
  const sel = selectedLayers();
  if (sel?.layers.length) commit(sel.section, align(sel.layers, mode, canvasSize(sel.section, sel.bp)), `Align ${mode}`);
}

/** Even gaps between three or more selected layers. */
export function distributeSelection(axis: "x" | "y") {
  const sel = selectedLayers();
  if (sel && sel.layers.length >= 3) commit(sel.section, distribute(sel.layers, axis), axis === "x" ? "Distribute horizontally" : "Distribute vertically");
}

export function nudgeSelection(dx: number, dy: number) {
  const sel = selectedLayers();
  if (!sel?.layers.length) return false;
  commit(
    sel.section,
    sel.layers.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy })),
    "Nudge",
  );
  return true;
}

// ------------------------------------------- quick actions for one block (the name tag)

/** Move a block or section one place up (-1) or down (1). One undo step. */
export function moveBlock(id: string, delta: -1 | 1) {
  const page = currentPage(getState());
  const next = nudgeOrder(page, id, delta);
  if (next !== page) updatePage(page.id, () => next, delta < 0 ? "Move up" : "Move down");
}

/** Duplicate a block or section right after itself and select the copy. One undo step. */
export function duplicateBlock(id: string) {
  const page = currentPage(getState());
  const at = locate(page, id);
  if (!at || at.kind === "overlay") return;
  const next = duplicate(page, id);
  if (next === page) return;
  const copy = at.kind === "section" ? next.sections[at.index + 1]?.id : next.sections.find((s) => s.id === at.section.id)?.children[at.index + 1]?.id;
  updatePage(page.id, () => next, "Duplicate");
  if (copy) selectBlock(copy);
}

/** Hide or show a block at the breakpoint being edited ("Visible on"). One undo step. */
export function toggleBlockHidden(id: string) {
  const { bp } = getState();
  const page = currentPage(getState());
  const at = locate(page, id);
  if (!at || at.kind === "overlay") return;
  const hidden = isHidden(at.kind === "section" ? at.section : at.node, bp);
  updatePage(page.id, (p) => setHidden(p, id, bp, !hidden), hidden ? "Show layer" : "Hide layer");
}

/** Delete a block or section and clear the selection. One undo step. */
export function deleteBlock(id: string) {
  const page = currentPage(getState());
  const next = remove(page, id);
  if (next === page) return;
  activateBreakpoint(getState().bp, null);
  updatePage(page.id, () => next, "Delete");
}

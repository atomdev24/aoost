import { addNode, addSection, createNode, createSection, locate, remove } from "../../model/page-ops";
import { placeRef, type RefItem } from "../../model/refs";
import { canvasSize } from "../../responsive/canvas";
import type { Section } from "../../schema";
import { withBox } from "../canvas/actions";
import { activateBreakpoint, selectBlock } from "./bridge";
import { addRef, removeRef } from "./refs-store";
import { frameOrigin, getBoard } from "./store";
import { currentPage, getState, updatePage } from "../store";

/**
 * Moving pictures between the board and the page: a reference dragged onto the editable frame
 * becomes an Image block where it lands, and a picture taken out of the page becomes a reference
 * on the board. The board is never published, so only what is moved into a frame reaches the site.
 */

const frame = () => document.querySelector<HTMLIFrameElement>("#preview-frame");

/** A point on screen in the editable frame's own pixels, or null when it's outside the frame. */
export function framePointAt(clientX: number, clientY: number): { x: number; y: number; doc: Document } | null {
  const f = frame();
  const doc = f?.contentDocument;
  if (!f || !doc) return null;
  const r = f.getBoundingClientRect();
  if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
  const z = getBoard().view.zoom;
  return { x: (clientX - r.left) / z, y: (clientY - r.top) / z, doc };
}

/**
 * Drop a reference onto the page at a point on screen. Returns false (and changes nothing) when the
 * point isn't over the editable frame. One undo step for the page; the reference leaves the board.
 */
export function refToPage(ref: RefItem, clientX: number, clientY: number): boolean {
  const at = framePointAt(clientX, clientY);
  if (!at) return false;
  const hit = at.doc.elementFromPoint(at.x, at.y);
  const page = currentPage(getState());
  const sectionEl = hit?.closest<HTMLElement>("[data-section-id]") ?? null;
  const loc = sectionEl ? locate(page, sectionEl.dataset.sectionId!) : null;
  const section: Section | null = loc?.kind === "section" ? loc.section : null;
  const content = { src: ref.src, width: Math.round(ref.w), height: Math.round(ref.h), alt: "" };
  const { bp } = getState();
  let node = createNode("Image", { content });

  if (section?.kind === "canvas" && sectionEl) {
    // Free layout: where it was dropped, at the size it had on the board (kept inside the section).
    const r = sectionEl.getBoundingClientRect();
    const art = canvasSize(section, bp);
    const s = art.width / r.width;
    const w = Math.min(art.width, ref.w * s);
    const h = (w / ref.w) * ref.h;
    const x = Math.max(0, Math.min(art.width - w, (at.x - r.left) * s - w / 2));
    const y = Math.max(0, Math.min(art.height - h, (at.y - r.top) * s - h / 2));
    const box = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    node = bp === "mobile" ? { ...node, style: { ...node.style, base: { ...node.style.base, ...box } } } : withBox(section, node, bp, box);
    const sid = section.id;
    updatePage(page.id, (p) => addNode(p, sid, node), "Move reference into the page");
  } else if (section) {
    // Stacked or grid: after the block it was dropped on, or at the end of the section.
    const nodeEl = hit?.closest<HTMLElement>("[data-node-id]");
    const index = nodeEl ? section.children.findIndex((n) => n.id === nodeEl.dataset.nodeId) + 1 : undefined;
    const sid = section.id;
    updatePage(page.id, (p) => addNode(p, sid, node, index && index > 0 ? index : undefined), "Move reference into the page");
  } else {
    const n = node;
    updatePage(page.id, (p) => addSection(p, createSection("flow", { children: [n] })), "Move reference into the page");
  }
  removeRef(ref.id);
  selectBlock(node.id);
  return true;
}

const newRefId = () => `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Take a picture off the page and put it on the board as a reference, centred on a point in the
 * frame's own pixels (it can be outside the frame). Only Image blocks with a picture can go.
 */
export function nodeToBoard(id: string, frameX?: number, frameY?: number): boolean {
  const page = currentPage(getState());
  const loc = locate(page, id);
  const node = loc?.kind === "node" ? loc.node : null;
  const src = node?.type === "Image" ? (node.content.src as string | undefined) : undefined;
  if (!node || !src) return false;
  const { bp } = getState();
  const o = frameOrigin(bp);
  const el = frame()?.contentDocument?.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
  const r = el?.getBoundingClientRect();
  // Where it goes: the point given, or just right of the frame level with where it was.
  const cx = o.x + (frameX ?? o.w + 80 + (r?.width ?? 300) / 2);
  const cy = o.y + (frameY ?? (r ? r.top + r.height / 2 : 200));
  const w = (node.content.width as number | undefined) ?? r?.width ?? 600;
  const h = (node.content.height as number | undefined) ?? r?.height ?? 400;
  activateBreakpoint(bp, null);
  updatePage(page.id, (p) => remove(p, id), "Move picture to the board");
  addRef(placeRef(newRefId(), src, cx, cy, w, h, Math.max(r?.width ?? 0, r?.height ?? 0) || 600));
  return true;
}

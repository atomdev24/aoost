import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { locate } from "../../model/page-ops";
import { sizeAt } from "../../components/aoost/frames";
import type { FrameSlot } from "../../components/types";
import { BREAKPOINT_LABEL, type Breakpoint, type Node } from "../../schema";
import { frameOrigin, getBoard } from "../board/store";
import { clampScale, clearItemPlace, setItemKeys, setItemPlace, setItemScale } from "../fields/size";
import { revealItem } from "./reveal";
import { beginGesture, currentPage, endGesture, getState, useEditor } from "../store";
import { itemSizeOf, nodeSlots, samePath, type SlotPath } from "./slots";

/**
 * Resizing the items of a block that sit on their own spot (the project pieces on the table).
 * Click a piece, in any frame, and it gets corner handles; drag one to scale the piece around its
 * own centre for that frame's size, keeping its shape. The whole drag is one undo step.
 */

export type PieceTarget = { id: string; path: SlotPath; bp: Breakpoint };

let target: PieceTarget | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const selectPiece = (t: PieceTarget | null) => {
  if (target === t || (target && t && target.id === t.id && target.bp === t.bp && samePath(target.path, t.path))) return;
  target = t;
  emit();
};
export const getPiece = () => target;
const usePiece = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => target,
  );

/** The resizable item under a point (in the frame's own pixels) inside a block's element; the topmost wins. */
export function pieceAtPoint(node: Node, blockEl: Element, x: number, y: number): FrameSlot | null {
  const slots = nodeSlots(node).filter((s) => s.box);
  for (let i = slots.length - 1; i >= 0; i--) {
    const el = blockEl.querySelector(slots[i]!.box!);
    const r = el?.getBoundingClientRect();
    if (r && r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return slots[i]!;
  }
  return null;
}

/** The piece hit by a click in a frame at `bp`, or null (which clears the piece selection). */
export function pieceFromClick(doc: Document, e: MouseEvent, bp: Breakpoint): PieceTarget | null {
  const el = (e.target as Element | null)?.closest?.("[data-node-id], .n");
  if (!el) return null;
  const id = el.getAttribute("data-node-id") ?? [...el.classList].find((c) => c.startsWith("n-"))?.slice(2) ?? "";
  const at = locate(currentPage(getState()), id);
  const node = at?.kind === "node" ? at.node : null;
  if (!node) return null;
  const block = doc.querySelector(`.n-${CSS.escape(node.id)}`) ?? el;
  const slot = pieceAtPoint(node, block, e.clientX, e.clientY);
  return slot ? { id: node.id, path: slot.path, bp } : null;
}

/** Clicks in Puck's editable frame pick (or drop) a piece. */
export function attachPieceSelect(doc: Document) {
  const click = (e: MouseEvent) => {
    if (e.button !== 0 || e.shiftKey) return;
    selectPiece(pieceFromClick(doc, e, getState().bp));
  };
  doc.addEventListener("click", click, true);
  return () => doc.removeEventListener("click", click, true);
}

function findNode(id: string): Node | null {
  const at = locate(currentPage(getState()), id);
  return at?.kind === "node" ? at.node : null;
}

type Geo = { x: number; y: number; w: number; h: number };

/** The piece's element and its table, in the editable frame. */
function pieceEls(t: PieceTarget): { piece: HTMLElement; table: HTMLElement } | null {
  const node = findNode(t.id);
  const slot = node ? nodeSlots(node).find((s) => s.box && samePath(s.path, t.path)) : null;
  const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument;
  const block = doc?.querySelector(`[data-node-id="${CSS.escape(t.id)}"]`);
  const piece = slot && block ? block.querySelector<HTMLElement>(slot.box!) : null;
  const table = piece?.offsetParent as HTMLElement | null;
  return piece && table ? { piece, table } : null;
}

/** The piece's box as drawn (its layout box scaled around its centre), in the board's screen pixels. */
function measure(t: PieceTarget): Geo | null {
  const node = findNode(t.id);
  const slot = node ? nodeSlots(node).find((s) => s.box && samePath(s.path, t.path)) : null;
  const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument;
  const block = doc?.querySelector(`[data-node-id="${CSS.escape(t.id)}"]`);
  const piece = slot && block ? block.querySelector<HTMLElement>(slot.box!) : null;
  const parent = piece?.offsetParent as HTMLElement | null;
  if (!piece || !parent) return null;
  // The centre of the piece as drawn: turning and scaling keep it, moving (a transform) doesn't.
  const r = piece.getBoundingClientRect();
  const raw = piece.ownerDocument.defaultView!.getComputedStyle(piece).scale;
  const s = raw && raw !== "none" ? Number(raw.split(" ")[0]) || 1 : 1;
  const w = piece.offsetWidth * s;
  const h = piece.offsetHeight * s;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const { view: v } = getBoard();
  const o = frameOrigin(getState().bp);
  return { x: (o.x + cx - w / 2) * v.zoom + v.x, y: (o.y + cy - h / 2) * v.zoom + v.y, w: w * v.zoom, h: h * v.zoom };
}

export function ResizePiece() {
  const t = usePiece();
  const bp = useEditor((s) => s.bp);
  const pageId = useEditor((s) => s.pageId);
  const selection = useEditor((s) => s.selection);
  const page = useEditor(currentPage);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [dragging, setDragging] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const node = t ? findNode(t.id) : null;
  const shown = !!t && t.bp === bp && !!node;

  // Drop the piece when the page changes, another size becomes active, or another block is selected.
  useEffect(() => () => selectPiece(null), [pageId]);
  useEffect(() => {
    if (target && target.bp !== bp) selectPiece(null);
  }, [bp]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (target && !selection.includes(target.id)) selectPiece(null);
  }, [selection]);
  useEffect(() => {
    if (t && (!node || !nodeSlots(node).some((s) => s.box && samePath(s.path, t.path)))) selectPiece(null);
  }, [t, node, page]);
  // Picking a piece or fixture opens its own settings in the inspector (and closes the others).
  const pickedKey = t ? `${t.id}|${t.path.join(".")}` : "";
  useEffect(() => {
    const n = t ? findNode(t.id) : null;
    if (t && n) revealItem(n.type, t.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedKey]);

  // Follow the piece every frame (zoom, pan and edits all move it).
  useLayoutEffect(() => {
    if (!shown) return setGeo(null);
    let raf = 0;
    const tick = () => {
      const g = target && measure(target);
      setGeo((old) => (g && old && JSON.stringify(old) === JSON.stringify(g) ? old : g));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [shown, t]);

  // Esc drops the piece (the block stays selected).
  useEffect(() => {
    if (!shown) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      selectPiece(null);
    };
    const win = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentWindow;
    window.addEventListener("keydown", key, true);
    win?.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      win?.removeEventListener("keydown", key, true);
    };
  }, [shown]);

  if (!shown || !t || !node || !geo) return null;
  const here = sizeAt(itemSizeOf(node, t.path), bp);
  const scale = here.scale;
  const placed = typeof here.x === "number";
  const slot = nodeSlots(node).find((s) => samePath(s.path, t.path));
  const label = slot?.label ?? "Piece";
  // A fixture keeps its own x/y (% of the table) and width (px), shared by every size.
  const fixture = !!slot?.fixture;
  const fix = fixture ? ((node.content as Record<string, unknown[]>)[String(t.path[0])]?.[Number(t.path[1])] as { width?: number } | undefined) : undefined;

  const startResize = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const bd = host.current!.getBoundingClientRect();
    const cx = bd.left + geo.x + geo.w / 2;
    const cy = bd.top + geo.y + geo.h / 2;
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    const s0 = scale;
    const w0 = fix?.width ?? 200;
    let moved = false;
    const move = (m: PointerEvent) => {
      const ratio = (Math.hypot(m.clientX - cx, m.clientY - cy) || 1) / d0;
      const next = clampScale(s0 * ratio);
      if (!moved) {
        if (Math.abs(ratio - 1) < 0.01) return;
        moved = true;
        setDragging(true);
        beginGesture();
      }
      if (fixture) setItemKeys(t.id, t.path, { width: Math.round(Math.min(800, Math.max(40, w0 * ratio))) }, "Resize fixture");
      else setItemScale(t.id, t.path, next);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      if (moved) endGesture();
      setDragging(false);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  // Drag the piece itself to place it on this size (its centre, as fractions of the table); one undo step.
  const startMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const els = pieceEls(t);
    if (!els) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const tr = els.table.getBoundingClientRect(), pr = els.piece.getBoundingClientRect();
    const W = els.table.clientWidth || 1, H = els.table.clientHeight || 1;
    const c0 = { x: pr.left + pr.width / 2 - tr.left, y: pr.top + pr.height / 2 - tr.top };
    // the spot is kept where all of the piece (as drawn) stays on the table, as on the site
    const hx = Math.min(0.5, pr.width / 2 / W), hy = Math.min(0.5, pr.height / 2 / H);
    const keep = (v: number, h: number) => Math.min(1 - h, Math.max(h, v));
    const zoom = getBoard().view.zoom || 1;
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    const move = (m: PointerEvent) => {
      const dx = (m.clientX - x0) / zoom, dy = (m.clientY - y0) / zoom;
      if (!moved) {
        if (Math.hypot(dx, dy) < 3) return;
        moved = true;
        setDragging(true);
        beginGesture();
      }
      if (fixture) {
        // its centre, as % of the table, the same for every size
        const pct = (v: number) => Math.round(Math.min(100, Math.max(0, v * 100)) * 10) / 10;
        setItemKeys(t.id, t.path, { x: pct((c0.x + dx) / W), y: pct((c0.y + dy) / H) }, "Move fixture");
      } else setItemPlace(t.id, t.path, keep((c0.x + dx) / W, hx), keep((c0.y + dy) / H, hy));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      if (moved) endGesture();
      setDragging(false);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  return (
    <div ref={host} className="ed-piece" aria-label={`${label}: move or resize`}>
      <div
        className={`ed-piece-box${dragging ? " is-dragging" : ""}`}
        style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h }}
        data-testid="piece-box"
        onPointerDown={startMove}
        onDoubleClick={(e) => {
          if (e.target !== e.currentTarget || !placed || fixture) return;
          clearItemPlace(t.id, t.path);
        }}
        title={placed ? "Drag to move this piece on this size · double-click to let the table place it" : "Drag to move this piece on this size"}
      >
        {(["nw", "ne", "se", "sw"] as const).map((c) => (
          <span key={c} className={`ed-piece-handle is-${c}`} data-piece-handle={c} onPointerDown={startResize} title="Drag to resize this piece on this size" />
        ))}
      </div>
      <span className="ed-piece-tag" style={{ left: geo.x, top: geo.y + geo.h + 6 }} role="status">
        {fixture ? `${label} · ${fix?.width ?? 200}px · every size` : `${label} · ${Math.round(scale * 100)}%${placed ? " · placed" : ""} · ${BREAKPOINT_LABEL[bp]}`}
      </span>
    </div>
  );
}

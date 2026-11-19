import { getBoard, panBy, setInteracting, zoomTo } from "../board/store";
import { pinchOf } from "./pinch";

export { pinchOf };

type Pt = { x: number; y: number };

/** How far a finger moves before a press becomes a pan (px). */
export const PAN_SLOP = 8;

export type GestureOptions = {
  /** The pointer in board (screen) coordinates at the moment of the event. */
  toBoard: (e: PointerEvent) => Pt;
  /** May one finger starting here pan the board? */
  canPanOne: (e: PointerEvent) => boolean;
  /** Touches starting here are left alone entirely (adjust mode, handles). */
  ignore?: (e: PointerEvent) => boolean;
  /** A one-finger tap that didn't move. */
  onTap?: (e: PointerEvent) => void;
};

/*
 * One gesture for the whole editor. A finger can land in a frame and its later
 * events arrive in the editor's document (or the other way round) once the
 * frame slides under it, so the fingers are tracked here, shared, by
 * pointerId. Positions are screenX/Y plus the offset to board coordinates
 * worked out where the finger landed: screen coordinates mean the same thing
 * in every document, and a frame moving mid-gesture doesn't feed back.
 */
const offsets = new Map<number, Pt>();
const pts = new Map<number, Pt>();
let mode: "idle" | "pending" | "pan" | "pinch" | "done" = "idle";
let start: Pt = { x: 0, y: 0 };
let last: { mid: Pt; dist: number } | null = null;
let lastOne: Pt | null = null;
let moved = false;
let tapper: GestureOptions["onTap"];
const seen = new WeakSet<Event>();

const at = (e: PointerEvent): Pt => {
  const o = offsets.get(e.pointerId) ?? { x: 0, y: 0 };
  return { x: e.screenX + o.x, y: e.screenY + o.y };
};
const two = () => {
  const [a, b] = [...pts.values()];
  return pinchOf(a!, b!);
};
const swallow = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
};
/** After a pan or pinch, the click the browser may still send is dropped (in whichever document gets it). */
function suppressClick(docs: Document[]) {
  const kill = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  for (const d of docs) d.addEventListener("click", kill, { capture: true, once: true });
  setTimeout(() => docs.forEach((d) => d.removeEventListener("click", kill, true)), 400);
}
const docOf = (t: Document | HTMLElement): Document => ("documentElement" in t ? (t as Document) : (t as HTMLElement).ownerDocument);

/** Touch on the board and in its frames: one finger on empty canvas pans, two fingers pinch to zoom and drag to pan. */
export function attachGestures(target: Document | HTMLElement, opts: GestureOptions): () => void {
  const doc = docOf(target);
  const down = (e: PointerEvent) => {
    if (e.pointerType !== "touch" || seen.has(e)) return;
    seen.add(e);
    // The first finger of a new touch starts afresh (a lift lost between documents can't leave a stale finger).
    if (e.isPrimary) {
      pts.clear();
      offsets.clear();
      mode = "idle";
    }
    if (opts.ignore?.(e)) return;
    const b = opts.toBoard(e);
    offsets.set(e.pointerId, { x: b.x - e.screenX, y: b.y - e.screenY });
    pts.set(e.pointerId, b);
    if (pts.size === 1) {
      moved = false;
      start = b;
      lastOne = b;
      tapper = opts.onTap;
      mode = opts.canPanOne(e) ? "pending" : "idle";
    } else if (pts.size === 2) {
      mode = "pinch";
      moved = true;
      last = two();
      setInteracting(true);
      swallow(e);
    }
  };
  const move = (e: PointerEvent) => {
    if (!pts.has(e.pointerId) || seen.has(e)) return;
    seen.add(e);
    // A finger handed between documents can arrive once without a position.
    if (e.screenX === 0 && e.screenY === 0) return;
    const p = at(e);
    pts.set(e.pointerId, p);
    if (mode === "pending" && Math.hypot(p.x - start.x, p.y - start.y) > PAN_SLOP) {
      mode = "pan";
      moved = true;
      setInteracting(true);
    }
    if (mode === "pan" && lastOne) {
      panBy(p.x - lastOne.x, p.y - lastOne.y);
      lastOne = p;
      swallow(e);
    } else if (mode === "pinch" && pts.size >= 2 && last) {
      const now = two();
      zoomTo(getBoard().view.zoom * (now.dist / last.dist), now.mid.x, now.mid.y);
      panBy(now.mid.x - last.mid.x, now.mid.y - last.mid.y);
      last = now;
      swallow(e);
    } else if (mode === "pending") {
      lastOne = p;
    }
  };
  const up = (e: PointerEvent) => {
    if (!pts.has(e.pointerId) || seen.has(e)) return;
    seen.add(e);
    pts.delete(e.pointerId);
    offsets.delete(e.pointerId);
    if (mode === "pinch" && pts.size < 2) mode = "done";
    if (pts.size > 0) return;
    if (moved) {
      const frames = [...document.querySelectorAll<HTMLIFrameElement>(".bd iframe")].map((f) => f.contentDocument).filter((d): d is Document => !!d);
      suppressClick([document, ...frames]);
      setInteracting(false);
    } else if (e.type === "pointerup") tapper?.(e);
    mode = "idle";
    last = null;
    lastOne = null;
  };

  const t = target as EventTarget;
  // Moves and lifts are watched on the whole document: they may arrive here for a finger that landed elsewhere.
  t.addEventListener("pointerdown", down as EventListener, true);
  doc.addEventListener("pointermove", move, true);
  doc.addEventListener("pointerup", up, true);
  doc.addEventListener("pointercancel", up, true);
  return () => {
    t.removeEventListener("pointerdown", down as EventListener, true);
    doc.removeEventListener("pointermove", move, true);
    doc.removeEventListener("pointerup", up, true);
    doc.removeEventListener("pointercancel", up, true);
  };
}

/** For a frame's document: one finger pans unless it lands on the selected block (which it may be moving). */
export function attachFrameGestures(doc: Document, toBoard: (e: PointerEvent) => Pt, selectedIds: () => string[]): () => void {
  doc.documentElement.style.touchAction = "none";
  return attachGestures(doc, {
    toBoard,
    canPanOne: (e) => {
      const el = e.target as Element | null;
      if (!el?.closest) return true;
      if (el.closest(".ed-tag")) return false;
      return !selectedIds().some((id) => el.closest(`[data-node-id="${CSS.escape(id)}"]`));
    },
  });
}

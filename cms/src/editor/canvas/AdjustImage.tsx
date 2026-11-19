import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { updateNode } from "../../model/page-ops";
import { resolve, setOnly } from "../../responsive/resolve";
import { DEFAULT_FRAME_FIT, type FrameFit, type Node } from "../../schema";
import { frameOrigin, getBoard, useBoard } from "../board/store";
import { beginGesture, currentPage, endGesture, getState, updatePage, useEditor } from "../store";
import { dragImage, imageRect, scaleImage, type Rect, type Size } from "./adjust";
import { naturalSize, slotOf, withSlotFrame, type SlotPath } from "./slots";

// ------------------------------------------------------------ which image is being adjusted

/** A block's own picture (Image, Video), or one picture inside its content (`path`, the aoost blocks). */
export type AdjustTarget = { id: string; path?: SlotPath };

let adjusting: AdjustTarget | null = null;
const listeners = new Set<() => void>();
/** Enter adjust mode. The whole session, however many drags and scrolls, is one undo step. */
export const startAdjust = (id: string, path?: SlotPath) => {
  if (adjusting) endGesture();
  adjusting = { id, path };
  beginGesture();
  listeners.forEach((l) => l());
};
export const stopAdjust = () => {
  if (adjusting === null) return;
  adjusting = null;
  endGesture();
  listeners.forEach((l) => l());
};
export const isAdjusting = () => adjusting !== null;
const useAdjusting = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => adjusting,
  );

/** The node's element in Puck's editable frame. */
const nodeEl = (id: string) => document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`) ?? null;

/** Can this block be adjusted on the canvas? (A framed picture with a loaded image.) */
export function adjustable(el: Element | null): el is HTMLElement {
  return !!el?.querySelector(".frame > .media, .frame > a > .media") && el.querySelector<HTMLImageElement>("img.media") !== null;
}

function findNode(id: string): Node | null {
  const page = currentPage(getState());
  for (const s of page.sections) for (const n of s.children) if (n.id === id) return n;
  for (const o of page.overlays) if (o.node.id === id) return o.node;
  return null;
}

/** The frame being adjusted: the block's own, or the content item's. */
const frameOf = (n: Node, t: AdjustTarget) => (t.path ? slotOf(n, t.path)?.frame : n.frame);

function writeFrame(t: AdjustTarget, fn: (f: FrameFit) => FrameFit) {
  const { bp, pageId } = getState();
  updatePage(
    pageId,
    (p) =>
      updateNode(p, t.id, (n) => {
        const r = frameOf(n, t) ?? { base: DEFAULT_FRAME_FIT };
        const next = setOnly(r, bp, fn({ ...DEFAULT_FRAME_FIT, ...resolve(r, bp) }));
        return t.path ? withSlotFrame(n, t.path, next) : { ...n, frame: next };
      }),
    "Adjust image",
  );
}

/**
 * Where the frame sits (in the canvas frame's own pixels), the picture's natural size and URL.
 * A content picture's frame is its own layout box: measured without its free-mode transform.
 */
function measure(t: AdjustTarget): { box: Rect; natural: Size; src: string } | null {
  const el = nodeEl(t.id);
  if (!el) return null;
  const n = findNode(t.id);
  const slot = t.path && n ? slotOf(n, t.path) : null;
  if (t.path) {
    const pic = slot ? el.querySelector<HTMLElement>(slot.selector) : null;
    if (!slot || !pic) return null;
    if (slot.kind === "bg") {
      const r = pic.getBoundingClientRect();
      const natural = naturalSize(slot.src);
      return natural ? { box: { x: r.left, y: r.top, w: r.width, h: r.height }, natural, src: slot.src } : null;
    }
    const img = pic as HTMLImageElement;
    const parent = img.offsetParent as HTMLElement | null;
    if (!img.naturalWidth || !parent) return null;
    const pr = parent.getBoundingClientRect();
    return { box: { x: pr.left + parent.clientLeft + img.offsetLeft, y: pr.top + parent.clientTop + img.offsetTop, w: img.offsetWidth, h: img.offsetHeight }, natural: { w: img.naturalWidth, h: img.naturalHeight }, src: img.currentSrc || img.src };
  }
  const frame = el.querySelector<HTMLElement>(".frame");
  const img = el.querySelector<HTMLImageElement>("img.media");
  if (!frame || !img || !img.naturalWidth) return null;
  const r = frame.getBoundingClientRect();
  return { box: { x: r.left, y: r.top, w: r.width, h: r.height }, natural: { w: img.naturalWidth, h: img.naturalHeight }, src: img.currentSrc || img.src };
}

type Geo = { frame: Rect; image: Rect; scale: number };

/**
 * "Adjust image" mode, InDesign style: drag the picture inside its frame,
 * scroll or pinch (or drag a corner) to scale it. The part outside the frame
 * shows at 35% with a dashed outline; a yellow tag shows the scale. Esc or a
 * click outside the picture leaves the mode. Stored as the frame's focal
 * point, pan and zoom at the active breakpoint.
 */
export function AdjustImage() {
  const target = useAdjusting();
  const id = target?.id ?? null;
  const bp = useEditor((s) => s.bp);
  const page = useEditor(currentPage);
  const view = useBoard((s) => s.view);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [src, setSrc] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const node = id ? findNode(id) : null;
  const slot = target?.path && node ? slotOf(node, target.path) : null;
  const current = node && target ? frameOf(node, target) : undefined;
  const fit: FrameFit = { ...DEFAULT_FRAME_FIT, ...(current ? resolve(current, bp) : {}) };
  // Background pictures (journal covers) can move inside their frame but not scale.
  const canScale = !slot || slot.kind === "img";

  // Leave the mode when the block or the picture goes away, or the page or breakpoint changes.
  useEffect(() => {
    if (target && (!node || (target.path && !slot))) stopAdjust();
  }, [target, node, slot]);
  useEffect(() => stopAdjust, [page.id, bp]);

  // Measure the frame in the live canvas every frame (zoom, pan, scroll and edits all move it).
  useLayoutEffect(() => {
    if (!target) return setGeo(null);
    let raf = 0;
    const tick = () => {
      const m = measure(target);
      const bd = host.current?.parentElement;
      if (m && bd) {
        const r = m.box;
        const { view: v } = getBoard();
        const o = frameOrigin(getState().bp);
        const box = { x: (o.x + r.x) * v.zoom + v.x, y: (o.y + r.y) * v.zoom + v.y, w: r.w * v.zoom, h: r.h * v.zoom };
        const n = findNode(target.id);
        const fr = n ? frameOf(n, target) : undefined;
        const f = { ...DEFAULT_FRAME_FIT, ...(fr ? resolve(fr, getState().bp) : {}) };
        const ir = imageRect(f, { w: r.w, h: r.h }, m.natural);
        const next = { frame: box, image: { x: box.x + ir.x * v.zoom, y: box.y + ir.y * v.zoom, w: ir.w * v.zoom, h: ir.h * v.zoom }, scale: v.zoom };
        setGeo((g) => (g && JSON.stringify(g) === JSON.stringify(next) ? g : next));
        setSrc(m.src);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // Esc leaves, in the editor and inside the canvas frame.
  useEffect(() => {
    if (!id) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      stopAdjust();
    };
    // On the canvas frame's window, so it runs before Puck's own Escape (which would drop the selection).
    const win = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentWindow;
    window.addEventListener("keydown", key, true);
    win?.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      win?.removeEventListener("keydown", key, true);
    };
  }, [id]);

  // Scroll or pinch scales the picture (and never zooms the board meanwhile).
  useEffect(() => {
    const el = host.current;
    if (!target || !el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canScale) return;
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
      const m = measure(target);
      writeFrame(target, (f) => (m ? scaleImage(f, factor, { w: m.box.w, h: m.box.h }, m.natural, { overhang: e.altKey }) : f));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [target, canScale, geo !== null]);

  if (!target || !node) return null;

  const frameSize = () => {
    const m = measure(target);
    return m ? { frame: { w: m.box.w, h: m.box.h }, natural: m.natural } : null;
  };

  const startMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const size = frameSize();
    if (!size) return;
    let last = { x: e.clientX, y: e.clientY };
    const move = (m: PointerEvent) => {
      const z = getBoard().view.zoom;
      const dx = (m.clientX - last.x) / z;
      const dy = (m.clientY - last.y) / z;
      last = { x: m.clientX, y: m.clientY };
      // Alt lets the picture leave a gap in its frame; otherwise it always covers it.
      writeFrame(target, (f) => dragImage(f, size.frame, size.natural, dx, dy, { overhang: m.altKey }));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const startScale = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || !geo) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const size = frameSize();
    if (!size) return;
    const bd = host.current!.getBoundingClientRect();
    const cx = bd.left + geo.image.x + geo.image.w / 2;
    const cy = bd.top + geo.image.y + geo.image.h / 2;
    let last = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    const move = (m: PointerEvent) => {
      const d = Math.hypot(m.clientX - cx, m.clientY - cy) || 1;
      const factor = d / last;
      last = d;
      writeFrame(target, (f) => scaleImage(f, factor, size.frame, size.natural, { overhang: m.altKey }));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const pct = Math.round((fit.fit === "free" ? fit.zoom : 1) * 100);
  return (
    <div
      ref={host}
      className="ed-adjust"
      role="dialog"
      aria-label="Adjust image"
      onPointerDown={(e) => {
        // A press outside the picture leaves the mode.
        if (e.target === e.currentTarget) stopAdjust();
      }}
    >
      {geo ? (
        <>
          <img className="ed-adjust-ghost" src={src} alt="" draggable={false} style={{ left: geo.image.x, top: geo.image.y, width: geo.image.w, height: geo.image.h }} />
          <div className="ed-adjust-frame" style={{ left: geo.frame.x, top: geo.frame.y, width: geo.frame.w, height: geo.frame.h }} />
          <div className="ed-adjust-hit" style={{ left: geo.image.x, top: geo.image.y, width: geo.image.w, height: geo.image.h }} onPointerDown={startMove} title={canScale ? "Drag to move the picture · scroll or pinch to scale · hold Alt to leave a gap" : "Drag to move the picture"}>
            {canScale ? (["nw", "ne", "se", "sw"] as const).map((c) => <span key={c} className={`ed-adjust-handle is-${c}`} onPointerDown={startScale} />) : null}
          </div>
          <span className="ed-adjust-tag" style={{ left: geo.frame.x, top: geo.frame.y + geo.frame.h + 6 }} role="status">
            {canScale ? `${pct}% · ` : ""}
            {slot ? `${slot.label} · ` : ""}
            {canScale ? "Alt: free move · " : ""}Esc to finish
          </span>
        </>
      ) : null}
    </div>
  );
}

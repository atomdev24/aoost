import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { updateNode } from "../../model/page-ops";
import { resolve, setOnly } from "../../responsive/resolve";
import { DEFAULT_FRAME_FIT, type FrameFit, type Node } from "../../schema";
import { frameOrigin, getBoard, useBoard } from "../board/store";
import { beginGesture, currentPage, endGesture, getState, updatePage, useEditor } from "../store";
import { dragImage, imageRect, scaleImage, type Rect } from "./adjust";

// ------------------------------------------------------------ which image is being adjusted

let adjusting: string | null = null;
const listeners = new Set<() => void>();
export const startAdjust = (id: string) => {
  adjusting = id;
  listeners.forEach((l) => l());
};
export const stopAdjust = () => {
  if (adjusting === null) return;
  adjusting = null;
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

function writeFrame(id: string, fn: (f: FrameFit) => FrameFit, opts: { merge?: string } = {}) {
  const { bp, pageId } = getState();
  updatePage(
    pageId,
    (p) =>
      updateNode(p, id, (n) => {
        const r = n.frame ?? { base: DEFAULT_FRAME_FIT };
        const next = fn({ ...DEFAULT_FRAME_FIT, ...resolve(r, bp) });
        return { ...n, frame: setOnly(r, bp, next) };
      }),
    "Adjust image",
    opts,
  );
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
  const id = useAdjusting();
  const bp = useEditor((s) => s.bp);
  const page = useEditor(currentPage);
  const view = useBoard((s) => s.view);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [src, setSrc] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const node = id ? findNode(id) : null;
  const fit: FrameFit = { ...DEFAULT_FRAME_FIT, ...(node?.frame ? resolve(node.frame, bp) : {}) };

  // Leave the mode when the block goes away or the page or breakpoint changes.
  useEffect(() => {
    if (id && !node) stopAdjust();
  }, [id, node]);
  useEffect(() => stopAdjust, [page.id, bp]);

  // Measure the frame in the live canvas every frame (zoom, pan, scroll and edits all move it).
  useLayoutEffect(() => {
    if (!id) return setGeo(null);
    let raf = 0;
    const tick = () => {
      const el = nodeEl(id);
      const frame = el?.querySelector<HTMLElement>(".frame");
      const img = el?.querySelector<HTMLImageElement>("img.media");
      const bd = host.current?.parentElement;
      if (frame && img && img.naturalWidth && bd) {
        const r = frame.getBoundingClientRect();
        const { view: v } = getBoard();
        const o = frameOrigin(getState().bp);
        const box = { x: (o.x + r.left) * v.zoom + v.x, y: (o.y + r.top) * v.zoom + v.y, w: r.width * v.zoom, h: r.height * v.zoom };
        const n = findNode(id);
        const f = { ...DEFAULT_FRAME_FIT, ...(n?.frame ? resolve(n.frame, getState().bp) : {}) };
        const ir = imageRect(f, { w: r.width, h: r.height }, { w: img.naturalWidth, h: img.naturalHeight });
        const next = { frame: box, image: { x: box.x + ir.x * v.zoom, y: box.y + ir.y * v.zoom, w: ir.w * v.zoom, h: ir.h * v.zoom }, scale: v.zoom };
        setGeo((g) => (g && JSON.stringify(g) === JSON.stringify(next) ? g : next));
        setSrc(img.currentSrc || img.src);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [id]);

  // Esc leaves, in the editor and inside the canvas frame.
  useEffect(() => {
    if (!id) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      stopAdjust();
    };
    const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument;
    window.addEventListener("keydown", key, true);
    doc?.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      doc?.removeEventListener("keydown", key, true);
    };
  }, [id]);

  // Scroll or pinch scales the picture (and never zooms the board meanwhile).
  useEffect(() => {
    const el = host.current;
    if (!id || !el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
      writeFrame(id, (f) => scaleImage(f, factor), { merge: `adjust-scale:${id}` });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [id, geo !== null]);

  if (!id || !node) return null;

  const frameSize = () => {
    const r = nodeEl(id)?.querySelector(".frame")?.getBoundingClientRect();
    const img = nodeEl(id)?.querySelector<HTMLImageElement>("img.media");
    return r && img ? { frame: { w: r.width, h: r.height }, natural: { w: img.naturalWidth, h: img.naturalHeight } } : null;
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
    beginGesture();
    const move = (m: PointerEvent) => {
      const z = getBoard().view.zoom;
      const dx = (m.clientX - last.x) / z;
      const dy = (m.clientY - last.y) / z;
      last = { x: m.clientX, y: m.clientY };
      writeFrame(id, (f) => dragImage(f, size.frame, size.natural, dx, dy));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      endGesture();
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
    const bd = host.current!.getBoundingClientRect();
    const cx = bd.left + geo.image.x + geo.image.w / 2;
    const cy = bd.top + geo.image.y + geo.image.h / 2;
    let last = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    beginGesture();
    const move = (m: PointerEvent) => {
      const d = Math.hypot(m.clientX - cx, m.clientY - cy) || 1;
      const factor = d / last;
      last = d;
      writeFrame(id, (f) => scaleImage(f, factor));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      endGesture();
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
          <div className="ed-adjust-hit" style={{ left: geo.image.x, top: geo.image.y, width: geo.image.w, height: geo.image.h }} onPointerDown={startMove} title="Drag to move the picture · scroll or pinch to scale">
            {(["nw", "ne", "se", "sw"] as const).map((c) => (
              <span key={c} className={`ed-adjust-handle is-${c}`} onPointerDown={startScale} />
            ))}
          </div>
          <span className="ed-adjust-tag" style={{ left: geo.frame.x, top: geo.frame.y + geo.frame.h + 6 }} role="status">
            {pct}% · Esc to finish
          </span>
        </>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { canvasSize, layerBox } from "../../responsive/canvas";
import { getComponent } from "../../components/registry";
import { setLayerBoxes } from "../canvas/actions";
import { resize, type Handle, type Rect } from "../canvas/geometry";
import { keepsRatio } from "../canvas/ratio";
import { reanchor } from "../canvas/reading-anchor";
import { currentPage, getState, useEditor } from "../store";
import { getBoard } from "./store";

/**
 * What hangs off the edge of the frame. A layer in a free-layout section can
 * reach past the screen's edge; the frame clips it there, and its handles with
 * it. Here, over the board: the selected layer's box and handles where the
 * frame can't show them (drag them to resize, or the box to move it), and with
 * W (as in InDesign's preview toggle) a faint view of every picture's part
 * outside the frame.
 */
let showing = false;
const subs = new Set<() => void>();
export const toggleOverflow = () => {
  showing = !showing;
  subs.forEach((l) => l());
};
const useShowing = () =>
  useSyncExternalStore(
    (l) => (subs.add(l), () => subs.delete(l)),
    () => showing,
  );

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const frameDoc = () => document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument ?? null;

type Box = { x: number; y: number; w: number; h: number };
type Ghost = Box & { id: string; src: string; fit: string; pos: string; transform: string; origin: string; selected: boolean; out: boolean };

const sameGhosts = (a: Ghost[], b: Ghost[]) => a.length === b.length && a.every((g, i) => JSON.stringify(g) === JSON.stringify(b[i]));

export function OverflowLayer({ frame }: { frame: Box }) {
  const show = useShowing();
  useEditor((s) => s.selection);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const dragging = useRef(false);

  // W toggles the view of what's outside the frame (not while typing), in the board and in the frame.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "w" && e.key !== "W") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const el = (e.target as HTMLElement | null) ?? null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      toggleOverflow();
    };
    window.addEventListener("keydown", key, true);
    const docs = new Set<Document>();
    const attach = setInterval(() => {
      const doc = frameDoc();
      if (doc && !docs.has(doc)) {
        docs.add(doc);
        doc.addEventListener("keydown", key, true);
      }
    }, 500);
    return () => {
      window.removeEventListener("keydown", key, true);
      clearInterval(attach);
      docs.forEach((d) => d.removeEventListener("keydown", key, true));
    };
  }, []);

  // Follow the layers in the frame (cheap: only canvas layers are measured).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (dragging.current) return;
      const doc = frameDoc();
      if (!doc) return;
      const want = new Set(getState().selection);
      const next: Ghost[] = [];
      doc.querySelectorAll<HTMLElement>('.s[data-kind="canvas"] > .si > .n').forEach((n) => {
        const id = n.dataset.nodeId;
        if (!id) return;
        const selected = want.has(id);
        if (!selected && !showing) return;
        const r = n.getBoundingClientRect();
        const out = r.left < -0.5 || r.right > frame.w + 0.5 || r.top < -0.5;
        if (!out && !selected) return;
        const img = n.querySelector<HTMLImageElement>("img.media");
        const cs = img ? getComputedStyle(img) : null;
        next.push({ id, x: r.left, y: r.top, w: r.width, h: r.height, src: img?.currentSrc || img?.src || "", fit: cs?.objectFit ?? "cover", pos: cs?.objectPosition ?? "50% 50%", transform: cs?.transform ?? "none", origin: cs?.transformOrigin ?? "50% 50%", selected, out });
      });
      setGhosts((prev) => (sameGhosts(prev, next) ? prev : next));
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [frame.w]);

  /** Resize (a handle) or move (the box) a layer from outside the frame: same rules as inside it. */
  const startDrag = (e: React.PointerEvent, id: string, handle: Handle | null) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const state = getState();
    const page = currentPage(state);
    const section = page.sections.find((s) => s.kind === "canvas" && s.children.some((n) => n.id === id));
    const node = section?.children.find((n) => n.id === id);
    const doc = frameDoc();
    const el = doc?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`);
    const si = el?.parentElement;
    if (!section || !node || node.locked || !el || !si) return;
    const art = canvasSize(section, state.bp);
    const scale = si.getBoundingClientRect().width / art.width;
    const start: Rect = layerBox(section, node, state.bp);
    const origin = { x: e.clientX, y: e.clientY };
    const zoom = getBoard().view.zoom;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    dragging.current = true;
    let box: Rect = start;
    const move = (m: PointerEvent) => {
      const dx = (m.clientX - origin.x) / zoom / scale;
      const dy = (m.clientY - origin.y) / zoom / scale;
      box = handle ? resize(start, handle, dx, dy, { keepRatio: keepsRatio(node) !== m.shiftKey }).box : { ...start, x: Math.round((start.x + dx) * 100) / 100, y: Math.round((start.y + dy) * 100) / 100 };
      const s = el.style;
      s.left = `${(box.x / art.width) * 100}%`;
      s.top = `${(box.y / art.height) * 100}%`;
      s.width = `${(box.w / art.width) * 100}%`;
      s.height = `${(box.h / art.height) * 100}%`;
      const r = el.getBoundingClientRect();
      setGhosts((g) => g.map((x) => (x.id === id ? { ...x, x: r.left, y: r.top, w: r.width, h: r.height } : x)));
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      dragging.current = false;
      if (box === start) return;
      setLayerBoxes(section.id, { [id]: box }, handle ? "Resize layer" : "Move layer");
      setTimeout(() => ["left", "top", "width", "height"].forEach((p) => el.style.removeProperty(p)), 80);
      if (node.type === "FruitReading") setTimeout(() => reanchor([id]), 120);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  if (!ghosts.length) return null;
  const sel = ghosts.find((g) => g.selected && g.out);
  return (
    <div className="bd-over" style={{ left: frame.x, top: frame.y }}>
      {show
        ? ghosts
            .filter((g) => g.out && g.src)
            .map((g) => (
              <div key={`g-${g.id}`} className="bd-over-ghost" style={{ left: g.x, top: g.y, width: g.w, height: g.h }}>
                <img src={g.src} alt="" style={{ objectFit: g.fit as React.CSSProperties["objectFit"], objectPosition: g.pos, transform: g.transform === "none" ? undefined : g.transform, transformOrigin: g.origin }} />
              </div>
            ))
        : null}
      {sel ? (
        <div className="bd-over-sel" style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }} title={`${getComponent(currentPage(getState()).sections.flatMap((s) => s.children).find((n) => n.id === sel.id)?.type ?? "")?.label ?? "Layer"} reaches past the frame. Drag a handle to resize. W shows what's outside.`}>
          {HANDLES.map((h) => (
            <span key={h} className="bd-over-h" data-h={h} onPointerDown={(e) => startDrag(e, sel.id, h)} />
          ))}
          <span className="bd-over-tip">{show ? "W: hide outside" : "W: show outside"}</span>
        </div>
      ) : null}
    </div>
  );
}

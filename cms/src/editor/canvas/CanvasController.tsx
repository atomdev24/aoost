import { useGetPuck } from "@puckeditor/core";
import { useEffect, useRef } from "react";
import { canvasSize, layerBox } from "../../responsive/canvas";
import { currentPage, getState, setSelection } from "../store";
import { nudgeSelection, setLayerBoxes } from "./actions";
import { axisLock, resize, snapMove, type Guide, type Handle, type Rect } from "./geometry";

const LAYER = '.s[data-kind="canvas"] > .si > .n';
const SNAP_PX = 6; // on-screen distance at which a layer snaps
const DRAG_START_PX = 3;

/**
 * Free-canvas interaction, living inside the preview iframe: drag layers
 * anywhere, resize from handles, snap to the artboard and to other layers
 * with smart guides, hold Shift to lock an axis (or keep the ratio while
 * resizing), Alt to turn snapping off, arrows to nudge.
 * Puck still owns selection; this only takes over once the pointer moves.
 */
export function CanvasController() {
  const marker = useRef<HTMLSpanElement>(null);
  const getPuck = useGetPuck();

  useEffect(() => {
    const doc = marker.current!.ownerDocument;
    let cleanup: (() => void) | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element;
      const el = target.closest<HTMLElement>(LAYER);
      if (!el) return;
      const id = el.dataset.nodeId!;
      const si = el.parentElement!;
      const state = getState();
      const section = currentPage(state).sections.find((s) => s.children.some((n) => n.id === id));
      const node = section?.children.find((n) => n.id === id);
      if (!section || !node) return;

      if (e.shiftKey && !target.closest("[data-ed-handle]")) {
        // Shift-click adds to (or removes from) the canvas selection.
        const has = state.selection.includes(id);
        setSelection(has ? state.selection.filter((x) => x !== id) : [...state.selection, id]);
      }
      if (node.locked) return;
      // Canvas layers move freely: keep this press away from Puck's list-drag sensor,
      // which would otherwise start dragging the whole section.
      e.stopPropagation();

      const handle = target.closest<HTMLElement>("[data-ed-handle]")?.dataset.edHandle as Handle | undefined;
      const artboard = canvasSize(section, state.bp);
      const scale = si.getBoundingClientRect().width / artboard.width;
      const moving = handle ? [id] : state.selection.includes(id) ? state.selection.filter((x) => section.children.some((n) => n.id === x && !n.locked)) : [id];
      const start = new Map<string, Rect>(section.children.filter((n) => moving.includes(n.id)).map((n) => [n.id, layerBox(section, n, state.bp)]));
      const others = section.children.filter((n) => !moving.includes(n.id) && !n.style.base.hidden).map((n) => layerBox(section, n, state.bp));
      const els = new Map<string, HTMLElement>([...start.keys()].map((k) => [k, si.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(k)}"]`)!]));
      const origin = { x: e.clientX, y: e.clientY };
      let dragging = false;
      let result = new Map<string, Rect>();
      const guideLayer = doc.createElement("div");
      guideLayer.className = "ed-guides";

      const paint = (boxes: Map<string, Rect>, guides: Guide[]) => {
        for (const [k, b] of boxes) {
          const s = els.get(k)?.style;
          if (!s) continue;
          s.left = `${(b.x / artboard.width) * 100}%`;
          s.top = `${(b.y / artboard.height) * 100}%`;
          s.width = `${(b.w / artboard.width) * 100}%`;
          s.height = `${(b.h / artboard.height) * 100}%`;
        }
        guideLayer.replaceChildren(
          ...guides.map((g) => {
            const line = doc.createElement("i");
            const pct = (n: number, of: number) => `${(n / of) * 100}%`;
            if (g.axis === "x") Object.assign(line.style, { left: pct(g.pos, artboard.width), top: pct(g.from, artboard.height), height: pct(g.to - g.from, artboard.height), width: "1px" });
            else Object.assign(line.style, { top: pct(g.pos, artboard.height), left: pct(g.from, artboard.width), width: pct(g.to - g.from, artboard.width), height: "1px" });
            return line;
          }),
        );
      };

      const onMove = (ev: PointerEvent) => {
        let dx = (ev.clientX - origin.x) / scale;
        let dy = (ev.clientY - origin.y) / scale;
        if (!dragging) {
          if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < DRAG_START_PX) return;
          dragging = true;
          si.appendChild(guideLayer);
          doc.documentElement.classList.add("ed-dragging");
        }
        ev.preventDefault();
        const threshold = ev.altKey ? 0 : SNAP_PX / scale;
        const first = start.get(id)!;
        let guides: Guide[] = [];
        result = new Map();
        if (handle) {
          const r = resize(first, handle, dx, dy, { keepRatio: ev.shiftKey, others, artboard, threshold });
          guides = r.guides;
          result.set(id, r.box);
        } else {
          if (ev.shiftKey) ({ dx, dy } = axisLock(dx, dy));
          const snapped = snapMove({ ...first, x: first.x + dx, y: first.y + dy }, others, artboard, threshold);
          guides = snapped.guides;
          const sx = snapped.box.x - first.x;
          const sy = snapped.box.y - first.y;
          for (const [k, b] of start) result.set(k, { ...b, x: Math.round((b.x + sx) * 100) / 100, y: Math.round((b.y + sy) * 100) / 100 });
        }
        paint(result, guides);
      };

      const finish = () => {
        doc.removeEventListener("pointermove", onMove, true);
        doc.removeEventListener("pointerup", onUp, true);
        doc.removeEventListener("pointercancel", onUp, true);
        guideLayer.remove();
        doc.documentElement.classList.remove("ed-dragging");
        cleanup = null;
      };
      const onUp = () => {
        finish();
        if (!dragging || !result.size) return;
        setLayerBoxes(section.id, Object.fromEntries(result), handle ? "Resize layer" : result.size > 1 ? "Move layers" : "Move layer");
        // The generated CSS now holds these values; drop the temporary inline ones once it has rendered.
        const kept = getState().selection;
        setTimeout(() => {
          els.forEach((n) => n && ["left", "top", "width", "height"].forEach((p) => n.style.removeProperty(p)));
          // Keep the dragged layer selected (the pointer-up would otherwise select whatever is underneath).
          const puck = getPuck();
          const selector = puck.getSelectorForId(id);
          if (selector) puck.dispatch({ type: "setUi", ui: { itemSelector: selector } });
          setSelection(kept.includes(id) ? kept : [id]);
        }, 80);
        // Swallow the click that follows a drag so it doesn't re-trigger selection logic.
        doc.addEventListener("click", (c) => c.stopPropagation(), { capture: true, once: true });
      };
      doc.addEventListener("pointermove", onMove, true);
      doc.addEventListener("pointerup", onUp, true);
      doc.addEventListener("pointercancel", onUp, true);
      cleanup = finish;
    };

    const onKey = (e: KeyboardEvent) => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      // ⌘↑/↓ move the block in the page order (commands/shortcuts.ts), not nudge it.
      if (!delta || e.metaKey || e.ctrlKey) return;
      const active = doc.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      const step = e.shiftKey ? 10 : 1;
      if (nudgeSelection(delta[0]! * step, delta[1]! * step)) e.preventDefault();
    };

    doc.addEventListener("pointerdown", onDown, true);
    doc.addEventListener("keydown", onKey);
    return () => {
      cleanup?.();
      doc.removeEventListener("pointerdown", onDown, true);
      doc.removeEventListener("keydown", onKey);
    };
  }, [getPuck]);

  return <span ref={marker} hidden />;
}

export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

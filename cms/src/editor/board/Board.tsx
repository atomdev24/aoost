import { Puck } from "@puckeditor/core";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { Breakpoint } from "../../schema";
import { currentPage, useEditor } from "../store";
import { activateBreakpoint } from "./bridge";
import { LiveFrame } from "./LiveFrame";
import { countMobileOverrides } from "./overrides";
import { frameRects, getBoard, openPage, panBy, setInteracting, setSize, useBoard } from "./store";
import { FRAME_GAP, isVisible, slotRect } from "./viewport";
import { onBoardWheel } from "./wheel";
import { ZoomBar } from "./ZoomBar";
import "./board.css";

const NAME: Record<Breakpoint, string> = { desktop: "Desktop", mobile: "Mobile" };

/**
 * The breakpoint board: an infinite pan/zoom canvas showing the page once per
 * breakpoint, side by side. The active breakpoint's frame is Puck's editable
 * preview; the others are live renders of the same draft. One document, many
 * views: an edit anywhere shows everywhere.
 */
export function Board() {
  const host = useRef<HTMLDivElement>(null);
  const pageId = useEditor((s) => s.pageId);
  const bp = useEditor((s) => s.bp);
  const page = useEditor(currentPage);
  const view = useBoard((s) => s.view);
  const size = useBoard((s) => s.size);
  const heights = useBoard((s) => s.heights);
  const spaceDown = useBoard((s) => s.spaceDown);
  const frames = useMemo(() => frameRects({ ...getBoard(), heights }), [heights]);
  const slot = slotRect(frames);
  const active = frames.find((f) => f.bp === bp)!;
  const overrides = useMemo(() => countMobileOverrides(page), [page]);

  useLayoutEffect(() => openPage(pageId), [pageId]);

  useEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setSize(el.clientWidth, el.clientHeight));
    ro.observe(el);
    const wheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect();
      onBoardWheel(e, { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", wheel);
    };
  }, []);

  // Space-drag (or middle-button drag) pans the board.
  const startPan = (e: React.PointerEvent) => {
    if (!(spaceDown || e.button === 1)) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setInteracting(true);
    let last = { x: e.clientX, y: e.clientY };
    target.classList.add("is-grabbing");
    const move = (m: PointerEvent) => {
      panBy(m.clientX - last.x, m.clientY - last.y);
      last = { x: m.clientX, y: m.clientY };
    };
    const up = () => {
      setInteracting(false);
      target.classList.remove("is-grabbing");
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const screen = (x: number, y: number) => ({ left: x * view.zoom + view.x, top: y * view.zoom + view.y });

  return (
    <div
      ref={host}
      className="bd"
      style={{ backgroundPosition: `${view.x}px ${view.y}px` }}
      onPointerDown={startPan}
      onPointerDownCapture={(e) => {
        // A click on empty board clears the selection, as in any canvas app.
        if (e.target === host.current && !spaceDown && e.button === 0) activateBreakpoint(bp, null);
      }}
      data-zoom={view.zoom.toFixed(3)}
    >
      <div className="bd-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        {/* Puck's editable frame. It stays the same element (moving an iframe reloads it) and slides to the active slot. */}
        <div className="bd-frame bd-frame-active" data-bp={bp} style={{ left: active.x, top: active.y, width: active.w, height: active.h }}>
          <Puck.Preview />
        </div>
        {frames
          .filter((f) => f.bp !== bp)
          .map((f) => (
            <div key={f.bp} className="bd-frame" data-bp={f.bp} style={{ left: f.x, top: f.y, width: f.w, height: f.h }}>
              <LiveFrame bp={f.bp} visible={!size.w || isVisible(view, f, size.w, size.h)} />
            </div>
          ))}
        <div className="bd-slot" style={{ left: slot.x, top: slot.y, width: slot.w, height: slot.h }} title="Coming soon: tablet and custom widths" aria-disabled="true" role="button" tabIndex={-1}>
          <span className="bd-slot-plus">+</span>
          <span>Add a breakpoint</span>
          <small>Coming soon: tablet and custom widths</small>
        </div>
      </div>

      {/* Labels stay readable at any zoom, so they live in screen space. */}
      {frames.map((f) => (
        <button
          key={f.bp}
          type="button"
          className={`bd-label${f.bp === bp ? " is-active" : ""}`}
          style={{ ...screen(f.x, f.y), maxWidth: Math.max(180, (f.w + FRAME_GAP * 0.9) * view.zoom) }}
          onClick={() => activateBreakpoint(f.bp)}
          aria-pressed={f.bp === bp}
          aria-label={`Edit the ${NAME[f.bp]} frame`}
        >
          <strong>{NAME[f.bp]}</strong> {f.w}
          {f.bp === "desktop" ? " · base for wide screens" : null}
          {f.bp === "mobile" && overrides ? <span className="bd-badge">{overrides === 1 ? "1 override" : `${overrides} overrides`}</span> : null}
        </button>
      ))}

      {spaceDown ? <div className="bd-shield" onPointerDown={startPan} /> : null}
      <ZoomBar />
    </div>
  );
}

import { Puck } from "@puckeditor/core";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BREAKPOINT_LABEL, DESIGN_WIDTH, type Breakpoint } from "../../schema";
import { AdjustImage } from "../canvas/AdjustImage";
import { EmptyPage } from "../insert/EmptyPage";
import { takeSnapshots, useSnapshot, watchSnapshots } from "./snapshots";
import { currentPage, useEditor } from "../store";
import { closeUnpinnedFlyout } from "../workspace/rail-store";
import { activateBreakpoint } from "./bridge";
import { LiveFrame } from "./LiveFrame";
import { countOverrides } from "./overrides";
import { frameRects, getBoard, openPage, panBy, resetFramePositions, setFrameHidden, setFramePosition, setHeight, setInteracting, setSize, toggleFrameHidden, useBoard, visibleFrameRects } from "./store";
import { FRAME_GAP, isVisible, slotRect } from "./viewport";
import { onBoardWheel } from "./wheel";
import { ZoomBar } from "./ZoomBar";
import "./board.css";

const NAME = BREAKPOINT_LABEL;
const EXTRA_FRAMES: Breakpoint[] = ["tablet", "widescreen"];
/** What each frame inherits from, under its label. */
const NOTE: Partial<Record<Breakpoint, string>> = { desktop: " · base for wide screens", tablet: " · from mobile", widescreen: " · from desktop" };
/** ?snapshot=hold keeps the loading view up (for screenshots of it). */
const hold = new URLSearchParams(location.search).get("snapshot") === "hold";

/**
 * While a frame hasn't drawn the open page yet, it shows that page's last
 * snapshot at 55%, then crossfades to the live frame. With no snapshot the
 * frame stays plain. A first snapshot is taken once the page has loaded.
 */
function LoadingCover({ bp, pageId, slug, ready }: { bp: Breakpoint; pageId: string; slug: string; ready: boolean }) {
  const snap = useSnapshot(pageId, bp);
  const [gone, setGone] = useState(false);
  useEffect(() => setGone(false), [pageId]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), 320);
    if (snap === null) {
      const s = setTimeout(() => void takeSnapshots(pageId, slug), 4000);
      return () => (clearTimeout(t), clearTimeout(s));
    }
    return () => clearTimeout(t);
  }, [ready, snap, pageId, slug]);
  // Until the frame has drawn, it takes the snapshot's height.
  useEffect(() => {
    if (!ready && snap) setHeight(bp, snap.height);
  }, [ready, snap, bp]);
  if (gone) return null;
  return (
    <div className={`bd-cover${ready ? " is-done" : ""}`} aria-hidden="true">
      {snap ? <img src={snap.url} alt="" draggable={false} /> : null}
    </div>
  );
}

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
  const positions = useBoard((s) => s.positions);
  const hidden = useBoard((s) => s.hidden);
  const dotGrid = useBoard((s) => s.dotGrid);
  const allFrames = useMemo(() => frameRects({ ...getBoard(), heights, positions, hidden }), [heights, positions, hidden]);
  const frames = useMemo(() => visibleFrameRects({ ...getBoard(), heights, positions, hidden }), [heights, positions, hidden]);
  const slot = slotRect(frames);
  const active = allFrames.find((f) => f.bp === bp)!;
  const hiddenBps = (Object.keys(hidden) as Breakpoint[]).filter((b) => hidden[b]);
  const overrides = useMemo(() => ({ mobile: countOverrides(page, "mobile"), tablet: countOverrides(page, "tablet"), widescreen: countOverrides(page, "widescreen"), desktop: 0 }) as Record<Breakpoint, number>, [page]);
  const addable = EXTRA_FRAMES.filter((b) => hidden[b]);
  const ready = useBoard((s) => s.ready);
  const loading = hold || frames.some((f) => !ready[f.bp] && (f.bp === bp || !size.w || isVisible(view, f, size.w, size.h)));
  useEffect(() => watchSnapshots(), []);

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

  // A frame's label is its drag handle; a press without movement is a click.
  const dragged = useRef(false);
  const startFrameDrag = (e: React.PointerEvent<HTMLElement>, f: { bp: Breakpoint; x: number; y: number }) => {
    if (e.button !== 0 || spaceDown) return;
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY };
    const zoom = getBoard().view.zoom;
    dragged.current = false;
    const move = (m: PointerEvent) => {
      const dx = m.clientX - start.x;
      const dy = m.clientY - start.y;
      if (!dragged.current && Math.hypot(dx, dy) < 3) return;
      if (!dragged.current) {
        dragged.current = true;
        setInteracting(true);
        target.classList.add("is-dragging");
      }
      setFramePosition(f.bp, { x: Math.round(f.x + dx / zoom), y: Math.round(f.y + dy / zoom) });
    };
    const up = () => {
      if (dragged.current) setInteracting(false);
      target.classList.remove("is-dragging");
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
      data-grid={dotGrid ? "true" : "false"}
      onPointerDown={startPan}
      onPointerDownCapture={(e) => {
        closeUnpinnedFlyout();
        // A click on empty board clears the selection, as in any canvas app.
        if (e.target === host.current && !spaceDown && e.button === 0) activateBreakpoint(bp, null);
      }}
      data-zoom={view.zoom.toFixed(3)}
    >
      <div className="bd-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        {/* Puck's editable frame. It stays the same element (moving an iframe reloads it) and slides to the active slot. */}
        <div className="bd-frame bd-frame-active" data-bp={bp} style={{ left: active.x, top: active.y, width: active.w, height: active.h, display: hidden[bp] ? "none" : undefined }}>
          <Puck.Preview />
          <LoadingCover bp={bp} pageId={pageId} slug={page.slug} ready={ready[bp] && !hold} />
        </div>
        {frames
          .filter((f) => f.bp !== bp)
          .map((f) => (
            <div key={f.bp} className="bd-frame" data-bp={f.bp} style={{ left: f.x, top: f.y, width: f.w, height: f.h }}>
              <LiveFrame bp={f.bp} visible={!size.w || isVisible(view, f, size.w, size.h)} />
              <LoadingCover bp={f.bp} pageId={pageId} slug={page.slug} ready={ready[f.bp] && !hold} />
            </div>
          ))}
        {addable.length ? (
          <div className="bd-slot" style={{ left: slot.x, top: slot.y, width: slot.w, height: slot.h }} role="group" aria-label="Add a breakpoint">
            <span className="bd-slot-plus">+</span>
            <span>Add a breakpoint</span>
            {addable.map((b) => (
              <button
                key={b}
                type="button"
                className="bd-slot-add"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setFrameHidden(b, false);
                  activateBreakpoint(b);
                }}
              >
                {NAME[b]} <small>{DESIGN_WIDTH[b]}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Labels stay readable at any zoom, so they live in screen space. */}
      {frames.map((f) => (
        <div key={f.bp} className="bd-label-wrap" style={{ ...screen(f.x, f.y), maxWidth: Math.max(180, (f.w + FRAME_GAP * 0.9) * view.zoom) }}>
          <button
            type="button"
            className={`bd-label${f.bp === bp ? " is-active" : ""}`}
            onPointerDown={(e) => startFrameDrag(e, f)}
            onClick={(e) => {
              if (dragged.current) {
                dragged.current = false;
                e.preventDefault();
                return;
              }
              activateBreakpoint(f.bp);
            }}
            aria-pressed={f.bp === bp}
            aria-label={`Edit the ${NAME[f.bp]} frame`}
            title="Click to edit, drag to move"
          >
            <strong>{NAME[f.bp]}</strong> {f.w}
            {NOTE[f.bp] ?? null}
            {overrides[f.bp] ? <span className="bd-badge">{overrides[f.bp] === 1 ? "1 override" : `${overrides[f.bp]} overrides`}</span> : null}
          </button>
          <FrameMenu bp={f.bp} canHide={frames.length > 1} />
        </div>
      ))}

      {hiddenBps.length ? (
        <div className="bd-hidden-chip" role="status">
          {hiddenBps.map((b) => (
            <span key={b}>
              {NAME[b]} hidden ·{" "}
              <button type="button" onClick={() => setFrameHidden(b, false)}>
                Show
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <AdjustImage />
      {!hidden[bp] ? <EmptyPage rect={{ ...screen(active.x, active.y), width: active.w * view.zoom, height: active.h * view.zoom }} /> : null}
      {loading ? (
        <div className="bd-loading-chip" role="status">
          <span className="ed-spinner" aria-hidden="true" /> Loading latest…
        </div>
      ) : null}
      {spaceDown ? <div className="bd-shield" onPointerDown={startPan} /> : null}
      <ZoomBar />
    </div>
  );
}

/** The small "…" menu beside a frame label: hide this frame, or put every frame back. */
function FrameMenu({ bp, canHide }: { bp: Breakpoint; canHide: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc, true);
    };
  }, [open]);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <div className="bd-frame-menu" ref={box} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="bd-label-more" aria-label={`Frame options for ${NAME[bp]}`} aria-haspopup="menu" aria-expanded={open} title="Frame options" onClick={() => setOpen(!open)}>
        …
      </button>
      {open ? (
        <ul className="bd-menu" role="menu" aria-label={`${NAME[bp]} frame`}>
          <li role="none">
            <button type="button" role="menuitem" disabled={!canHide} title={canHide ? undefined : "At least one frame stays visible"} onClick={pick(() => toggleFrameHidden(bp))}>
              Hide frame
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" onClick={pick(resetFramePositions)}>
              Reset positions
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

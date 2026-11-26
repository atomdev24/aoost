import { useEffect } from "react";
import { activateBreakpoint } from "./bridge";
import { framePointAt, refToPage } from "./ref-page";
import { getRefs, loadRefs, moveRef, raiseRef, removeRef, selectRef, sizeRef, useRefs } from "./refs-store";
import { getBoard, setInteracting } from "./store";
import { getState } from "../store";

/**
 * Reference images on the board, in world space behind the frames. Drag to move, drag the corner
 * to resize (keeps the shape), Delete to remove. They are for the editor only: nothing outside a
 * frame is ever on the site.
 */
export function RefLayer({ pageId, zoom }: { pageId: string; zoom: number }) {
  const items = useRefs((s) => s.items);
  const selected = useRefs((s) => s.selected);

  useEffect(() => void loadRefs(pageId), [pageId]);

  // Delete / Backspace removes the selected reference; Esc lets it go; a press elsewhere deselects.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const id = getRefs().selected;
      if (!id) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopImmediatePropagation();
        removeRef(id);
      } else if (e.key === "Escape") {
        e.stopImmediatePropagation();
        selectRef(null);
      }
    };
    const press = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.(".bd-ref")) selectRef(null);
    };
    window.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", press, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      document.removeEventListener("pointerdown", press, true);
    };
  }, []);

  /** Drag in screen pixels, applied in world pixels at the zoom of the moment. */
  const drag = (e: React.PointerEvent, apply: (dx: number, dy: number) => void, drop?: (m: PointerEvent) => void, over?: (m: PointerEvent) => void) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY };
    const z = getBoard().view.zoom;
    let moved = false;
    const move = (m: PointerEvent) => {
      const dx = (m.clientX - start.x) / z;
      const dy = (m.clientY - start.y) / z;
      if (!moved && Math.hypot(dx * z, dy * z) < 3) return;
      if (!moved) setInteracting(true);
      moved = true;
      apply(dx, dy);
      over?.(m);
    };
    const up = (m: PointerEvent) => {
      if (moved) setInteracting(false);
      if (moved && m.type === "pointerup") drop?.(m);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const line = 1.5 / zoom;
  return (
    <>
      {items.map((r) => {
        const on = r.id === selected;
        return (
          <div
            key={r.id}
            className={`bd-ref${on ? " is-selected" : ""}`}
            data-ref={r.id}
            style={{ left: r.x, top: r.y, width: r.w, height: r.h, outlineWidth: on ? line : 0, outlineOffset: line }}
            title="Reference: only on this board, never on the site"
            onPointerDown={(e) => {
              // A reference is picked on its own: the page's selection is let go.
              if (getState().selection.length) activateBreakpoint(getState().bp, null);
              selectRef(r.id);
              raiseRef(r.id);
              const el = e.currentTarget as HTMLElement;
              drag(
                e,
                (dx, dy) => moveRef(r.id, r.x + dx, r.y + dy),
                // Let go over the page: it becomes a picture there (the board keeps it otherwise).
                (m) => {
                  el.classList.remove("is-into-page");
                  const ref = getRefs().items.find((x) => x.id === r.id);
                  if (ref) refToPage(ref, m.clientX, m.clientY);
                },
                (m) => el.classList.toggle("is-into-page", !!framePointAt(m.clientX, m.clientY)),
              );
            }}
          >
            <img src={r.src} alt="" draggable={false} />
            {on ? (
              <>
                <span className="bd-ref-tag" style={{ fontSize: 11 / zoom, top: -22 / zoom, padding: `${2 / zoom}px ${6 / zoom}px`, borderRadius: 5 / zoom }}>
                  Reference · not on the site
                </span>
                <span
                  className="bd-ref-handle"
                  aria-label="Resize"
                  style={{ width: 12 / zoom, height: 12 / zoom, right: -6 / zoom, bottom: -6 / zoom, borderWidth: line }}
                  onPointerDown={(e) => {
                    const ratio = r.h / r.w;
                    drag(e, (dx) => {
                      const w = Math.max(24, r.w + dx);
                      sizeRef(r.id, w, w * ratio);
                    });
                  }}
                />
              </>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/** "Couldn't save" and similar, at the bottom left of the board. */
export function RefNotice() {
  const error = useRefs((s) => s.error);
  if (!error) return null;
  return (
    <div className="bd-hidden-chip bd-ref-notice" role="status">
      {error}
    </div>
  );
}

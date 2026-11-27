import { useEffect, useRef, useState } from "react";
import { MARK_KINDS, setMark, useMarks } from "./marks";
import { fit, setLinked, toggleDotGrid, useBoard, zoomStep, zoomTo } from "./store";

/** "Show": which marks the board draws (comments, variant changes, motion, screen-size edits). */
function ShowMenu() {
  const marks = useMarks();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => (document.removeEventListener("pointerdown", away), document.removeEventListener("keydown", key));
  }, [open]);
  const off = MARK_KINDS.filter((k) => !marks[k.id]).length;
  return (
    <div className="bd-show" ref={box}>
      <button type="button" className="bd-zb bd-zb-text" aria-haspopup="menu" aria-expanded={open} title="Choose which marks show on the board" onClick={() => setOpen(!open)}>
        Show{off ? <span className="bd-show-n">{MARK_KINDS.length - off}/{MARK_KINDS.length}</span> : null}
      </button>
      {open ? (
        <ul className="bd-show-menu" role="menu" aria-label="Show on the board">
          <li className="bd-show-head" role="presentation">Show on the board</li>
          {MARK_KINDS.map((k) => (
            <li key={k.id} role="none">
              <button type="button" role="menuitemcheckbox" aria-checked={marks[k.id]} title={k.hint} onClick={() => setMark(k.id, !marks[k.id])}>
                <span className="bd-show-box" aria-hidden="true">{marks[k.id] ? "✓" : ""}</span>
                {k.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
    {[2.5, 7, 11.5].flatMap((y) => [2.5, 7, 11.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" />))}
  </svg>
);

/** The frosted zoom pill at the bottom right: zoom out, the zoom %, zoom in, Fit, linked selection, dot grid. */
export function ZoomBar() {
  const zoom = useBoard((s) => s.view.zoom);
  const linked = useBoard((s) => s.linked);
  const dotGrid = useBoard((s) => s.dotGrid);
  return (
    <div className="bd-zoombar" role="toolbar" aria-label="Zoom">
      <button type="button" className="bd-zb" aria-label="Zoom out" title="Zoom out (⌘−)" onClick={() => zoomStep(-1)}>
        −
      </button>
      <button type="button" className="bd-zb bd-zb-pct" title="Zoom to 100% (⌘0)" aria-label={`Zoom ${Math.round(zoom * 100)}%, click for 100%`} onClick={() => zoomTo(1)}>
        <span className="bd-zoom-pct">{Math.round(zoom * 100)}%</span>
      </button>
      <button type="button" className="bd-zb" aria-label="Zoom in" title="Zoom in (⌘+)" onClick={() => zoomStep(1)}>
        +
      </button>
      <span className="bd-zb-rule" />
      <button type="button" className="bd-zb bd-zb-text" aria-label="Fit all frames" title="Fit all frames (⇧1)" onClick={fit}>
        Fit
      </button>
      <button type="button" className="bd-zb bd-zb-text" aria-pressed={linked} aria-label="Linked selection" title="Show the selection in every frame" onClick={() => setLinked(!linked)}>
        Linked
      </button>
      <span className="bd-zb-rule" />
      <ShowMenu />
      <button type="button" className="bd-zb bd-zb-grid" aria-label="Dot grid" aria-pressed={dotGrid} title="Dot grid (')" onClick={toggleDotGrid}>
        <GridIcon />
      </button>
    </div>
  );
}

import { fit, setLinked, toggleDotGrid, useBoard, zoomStep, zoomTo } from "./store";

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
      <button type="button" className="bd-zb bd-zb-grid" aria-label="Dot grid" aria-pressed={dotGrid} title="Dot grid (')" onClick={toggleDotGrid}>
        <GridIcon />
      </button>
    </div>
  );
}

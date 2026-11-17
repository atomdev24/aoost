import { fit, setLinked, useBoard, zoomStep, zoomTo } from "./store";

/** The floating bar at the bottom centre: zoom out, the zoom %, zoom in, Fit all, linked selection. */
export function ZoomBar() {
  const zoom = useBoard((s) => s.view.zoom);
  const linked = useBoard((s) => s.linked);
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
      <button type="button" className="bd-zb bd-zb-text" title="Fit all frames (⇧1)" onClick={fit}>
        Fit all
      </button>
      <button type="button" className="bd-zb bd-zb-text" aria-pressed={linked} title="Show the selection in every frame" onClick={() => setLinked(!linked)}>
        Linked selection
      </button>
    </div>
  );
}

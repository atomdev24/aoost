import { useEffect, useState } from "react";

/*
 * If the browser's own pinch zoom is on (the whole page magnified, toolbars out
 * of sight), say so where the person is looking. Browsers give pages no way to
 * undo it, so the notice says how: pinch out. It sits in the visible part of the
 * page and is drawn at normal size whatever the zoom.
 */
type VV = { scale: number; top: number; left: number; width: number };
const read = (): VV => {
  const v = window.visualViewport;
  return v ? { scale: v.scale, top: v.offsetTop, left: v.offsetLeft, width: v.width } : { scale: 1, top: 0, left: 0, width: innerWidth };
};

export function BrowserZoomNotice() {
  const [vv, setVv] = useState(read);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const update = () => setVv(read());
    v.addEventListener("resize", update);
    v.addEventListener("scroll", update);
    return () => {
      v.removeEventListener("resize", update);
      v.removeEventListener("scroll", update);
    };
  }, []);
  // Phones zoom on purpose (and the editor has its own phone layout); only desktop browsers need this.
  if (vv.scale < 1.02 || matchMedia("(pointer: coarse)").matches) return null;
  return (
    <div
      className="ed-zoom-notice"
      role="status"
      style={{ top: vv.top + 12 / vv.scale, left: vv.left + vv.width / 2, transform: `translateX(-50%) scale(${1 / vv.scale})` }}
    >
      The browser has zoomed the whole page ({Math.round(vv.scale * 100)}%). Pinch out to see the toolbars again.
    </div>
  );
}

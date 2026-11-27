/*
 * On the board nothing moves (frame-css stillMotion; Play shows the motion). A thin grey line in
 * the board's margin, just left of the frame, marks each section that moves: never on the design
 * itself, and grey so it doesn't compete. "Motion" in the zoom bar's Show menu hides them.
 * Found by looking at the frame itself, so any block takes part without changes: CSS animations
 * (tickers, marquees), entrance effects, canvases (the dot board), autoplaying video, Lottie and
 * 3D, and the blocks whose motion comes from their page script.
 */

/** Blocks whose motion comes from a page script, so the frame alone can't show it. */
const SCRIPTED = '.ao-b[data-ao="hero"],.ao-b[data-ao="projects"],.ao-b[data-ao="journals"],.ao-b[data-ao="playlists"],.ao-b[data-ao="wall"],.ao-b[data-ao="rodeo"],section.products .season-track';
const MOVING = `canvas,video[autoplay],.lottie,model-viewer,[data-enter],${SCRIPTED}`;

/** Does this section move on the live page? */
export function sectionMoves(section: Element): boolean {
  if (section.querySelector(MOVING)) return true;
  const anims = (section as Element & { getAnimations?: (o?: { subtree: boolean }) => Animation[] }).getAnimations?.({ subtree: true }) ?? [];
  return anims.some((a) => {
    const name = (a as CSSAnimation).animationName;
    // The editor's own flash and outlines aren't the page's motion.
    return !!name && !/^ed-/.test(name);
  });
}

export function markMotion(doc: Document): () => void {
  const win = doc.defaultView!;
  // The lines live on the board (the frame's parent), beside the frame.
  const box = (win.frameElement as HTMLElement | null)?.closest<HTMLElement>(".bd-frame") ?? null;
  const world = box?.parentElement ?? null;
  const lines = new Map<Element, HTMLElement>();
  let moving: Element[] = [];

  const place = () => {
    if (!box || !world) return;
    const px = parseFloat(doc.documentElement.style.getPropertyValue("--ed-px")) || 1;
    for (const s of moving) {
      let line = lines.get(s);
      if (!line) {
        line = world.ownerDocument.createElement("span");
        line.className = "ed-motion-line";
        line.title = "This section moves: Play above the frame shows it";
        world.appendChild(line);
        lines.set(s, line);
      }
      const r = s.getBoundingClientRect();
      line.style.left = `${box.offsetLeft - 14 * px}px`;
      line.style.top = `${box.offsetTop + r.top + win.scrollY}px`;
      line.style.height = `${Math.max(4, r.height)}px`;
      line.style.width = `${3 * px}px`;
    }
    for (const [s, l] of lines) if (!moving.includes(s)) (l.remove(), lines.delete(s));
  };
  const scan = () => {
    // Autoplaying videos hold still on the board too.
    doc.querySelectorAll("video").forEach((v) => !v.paused && v.pause());
    moving = [...doc.querySelectorAll("section.s[id]")].filter((s) => s.isConnected && sectionMoves(s));
    place();
  };

  let t = 0;
  const later = () => {
    win.clearTimeout(t);
    t = win.setTimeout(scan, 300);
  };
  const mo = new win.MutationObserver(later);
  mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-enter"] });
  // Zoom (--ed-px on the frame's root) and the frame moving on the board.
  const zoomed = new win.MutationObserver(place);
  zoomed.observe(doc.documentElement, { attributes: true, attributeFilter: ["style"] });
  const moved = box ? new MutationObserver(place) : null;
  if (box) moved!.observe(box, { attributes: true, attributeFilter: ["style"] });
  const ro = new win.ResizeObserver(place);
  ro.observe(doc.body);
  scan();
  return () => {
    win.clearTimeout(t);
    mo.disconnect();
    zoomed.disconnect();
    moved?.disconnect();
    ro.disconnect();
    for (const l of lines.values()) l.remove();
  };
}

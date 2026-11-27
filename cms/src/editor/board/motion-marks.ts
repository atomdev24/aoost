/*
 * On the canvas nothing moves (frame-css stillMotion; Play shows the motion). So people know a
 * section does move, each one with motion gets a small pink badge in its top-right corner,
 * in every frame (a pink circle with a play mark). Found by looking at the frame itself, so any block takes part without changes:
 * CSS animations (tickers, marquees), entrance effects, canvases (the dot board), autoplaying
 * video, Lottie and 3D, and the blocks whose motion comes from their page script.
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
  const layer = doc.createElement("div");
  layer.className = "ed-motion-layer";
  layer.setAttribute("aria-hidden", "true");
  doc.body.appendChild(layer);
  const badges = new Map<Element, HTMLElement>();

  const place = () => {
    for (const [s, b] of badges) {
      const r = s.getBoundingClientRect();
      b.style.top = `${r.top + win.scrollY}px`;
      b.style.left = `${r.right + win.scrollX}px`;
    }
  };
  const scan = () => {
    // Autoplaying videos hold still on the board too.
    doc.querySelectorAll("video").forEach((v) => !v.paused && v.pause());
    const sections = [...doc.querySelectorAll("section.s[id]")];
    for (const [s, b] of badges) if (!s.isConnected || !sections.includes(s)) (b.remove(), badges.delete(s));
    for (const s of sections) {
      const moves = sectionMoves(s);
      const had = badges.get(s);
      if (moves && !had) {
        const b = doc.createElement("span");
        b.className = "ed-motion-badge";
        b.title = "This section moves. Press Play above the frame to see it.";
        b.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5Z"/></svg>';
        layer.appendChild(b);
        badges.set(s, b);
      } else if (!moves && had) (had.remove(), badges.delete(s));
    }
    place();
  };

  let t = 0;
  const later = () => {
    win.clearTimeout(t);
    t = win.setTimeout(scan, 300);
  };
  const mo = new win.MutationObserver((ms) => {
    // Our own badges changing isn't a reason to look again.
    if (ms.every((m) => layer.contains(m.target))) return;
    later();
  });
  mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-enter"] });
  const ro = new win.ResizeObserver(place);
  ro.observe(doc.body);
  scan();
  return () => {
    win.clearTimeout(t);
    mo.disconnect();
    ro.disconnect();
    layer.remove();
  };
}

/** Styles for the badges, added to each frame's fixed editor CSS. */
export const motionBadgeCss =
  // A small pink circle with a play mark, top right of the section; the same size on screen at any zoom.
  ".ed-motion-layer{position:absolute;top:0;left:0;width:0;height:0;z-index:40;pointer-events:none}" +
  ".ed-motion-badge{position:absolute;transform:translate(calc(-100% - 8px * var(--ed-px,1)),calc(8px * var(--ed-px,1)));display:grid;place-items:center;width:calc(20px * var(--ed-px,1));height:calc(20px * var(--ed-px,1));border-radius:50%;background:#ff4fa3;color:#fff;box-shadow:0 0 0 calc(2px * var(--ed-px,1)) rgba(255,255,255,.85),0 calc(2px * var(--ed-px,1)) calc(6px * var(--ed-px,1)) rgba(0,0,0,.3);pointer-events:auto;cursor:help}" +
  ".ed-motion-badge svg{width:calc(9px * var(--ed-px,1));height:calc(9px * var(--ed-px,1));margin-left:calc(1px * var(--ed-px,1))}";

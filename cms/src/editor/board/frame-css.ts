/**
 * Editor frames are as tall as the page they show, so a viewport unit would
 * keep growing with them (100vh = the frame = the page + 100vh…). Inside the
 * editor, viewport units are pinned to a typical screen for the breakpoint.
 * Only the editor's copy of the CSS is rewritten; the site is untouched.
 */
export const SCREEN_HEIGHT = { desktop: 900, mobile: 844, tablet: 1194, widescreen: 1080 } as const;

const UNIT = /(-?\d*\.?\d+)(s|l|d)?vh\b/g;

export function pinViewportUnits(css: string, screenHeight: number): string {
  return css.replace(UNIT, (_m, n: string) => `${Math.round(Number(n) * screenHeight) / 100}px`);
}

/** Editor-only rules for a frame: no inner scrolling, the page's own height decides the frame's. */
export const frameBaseCss = `html,body,#frame-root{height:auto!important;min-height:0!important}html{overflow:hidden!important}body{overflow:visible!important}`;

/**
 * The site's own motion (tickers, spinning records, swaying keychains…) is paused in the board's
 * frames: four frames of it meant ~100 animations repainting all the time, which made the board
 * shimmer and drop pieces while zooming. Preview and the live site still move.
 */
export function stillMotion(doc: Document): () => void {
  const style = doc.createElement("style");
  style.id = "ed-still-motion";
  style.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}";
  doc.head.appendChild(style);
  return () => style.remove();
}

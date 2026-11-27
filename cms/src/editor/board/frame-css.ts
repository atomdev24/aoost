import { followMarks, marksCss } from "./marks";
import { markMotion } from "./motion-marks";
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
 * The site's own motion (tickers, spinning records, the hero's pan and dot board…) is paused in
 * every frame on the board: frames full of motion shimmered and dropped pieces while zooming, and
 * with several people on the canvas it flickered. A grey line in the margin marks each section
 * that moves (motion-marks.ts); Play above a frame shows it moving. Preview and the live site move.
 * The frame also follows the zoom bar's Show menu (marks.ts).
 */
export function stillMotion(doc: Document): () => void {
  const style = doc.createElement("style");
  style.id = "ed-still-motion";
  // Only the editor's own flash (a block Claude just changed) keeps playing.
  style.textContent =
    "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}.ed-flash,[data-ed-flash]{animation-play-state:running!important}" + marksCss;
  doc.head.appendChild(style);
  const unmark = markMotion(doc);
  const unfollow = followMarks(doc);
  return () => {
    unmark();
    unfollow();
    style.remove();
  };
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Breakpoint } from "../../schema";
import { activateBreakpoint } from "./bridge";
import { useStill } from "./stills";
import { getBoard, useBoard } from "./store";

/**
 * A frame's still picture, laid over its live page (see stills.ts).
 * - Every frame shows its picture while the board moves, so zooming and panning scale a picture
 *   instead of redrawing four live pages.
 * - Frames you aren't editing keep showing it; a click there makes that frame the one you edit.
 * - The frame you're editing goes back to its live page a moment after the board stops: the live
 *   page is drawn underneath first, then the picture fades out over it, so there is no blank step.
 * While the picture shows, the live page underneath isn't drawn at all (that's the saving).
 */
export function FrameStill({ bp, pageId, active }: { bp: Breakpoint; pageId: string; active: boolean }) {
  const still = useStill(bp);
  const moving = useBoard((s) => s.moving || s.interacting);
  const want = !!still && still.pageId === pageId && (moving || !active);
  // shown: the picture is up and the live page hidden; leaving: the live page is back and the picture fading.
  const [phase, setPhase] = useState<"off" | "shown" | "leaving">(want ? "shown" : "off");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (want) {
      setPhase("shown");
      return;
    }
    if (phase !== "shown") return;
    // Live page first (hidden pages aren't drawn), two frames for it to paint, then fade the picture.
    setPhase("leaving");
    let id = requestAnimationFrame(() => (id = requestAnimationFrame(() => ref.current?.classList.add("is-fading"))));
    const t = setTimeout(() => setPhase("off"), 260);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);

  // The frame's own page is hidden only while the picture fully covers it.
  useLayoutEffect(() => {
    const frame = ref.current?.parentElement ?? document.querySelector(`.bd-frame[data-bp="${bp}"]`);
    frame?.classList.toggle("is-still", phase === "shown");
    return () => frame?.classList.remove("is-still");
  }, [phase, bp]);

  if (phase === "off" || !still) return null;
  return (
    <div
      ref={ref}
      className={`bd-still${phase === "leaving" ? " is-leaving" : ""}`}
      aria-hidden="true"
      onClick={active ? undefined : (e) => clickThrough(bp, e.currentTarget, e.clientX, e.clientY)}
    >
      <img src={still.url} alt="" draggable={false} width={still.w} height={still.h} decoding="sync" />
    </div>
  );
}

/**
 * A click on a frame's picture lands on the live page under it, exactly where it was made, so it
 * picks that block (or piece) as a click on the page would. The live page is only hidden from the
 * board; inside its own document everything is still there to hit.
 */
function clickThrough(bp: Breakpoint, el: HTMLElement, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect();
  const zoom = getBoard().view.zoom;
  const x = (clientX - r.left) / zoom;
  const y = (clientY - r.top) / zoom;
  const frame = el.parentElement?.querySelector("iframe");
  const doc = frame?.contentDocument;
  const target = doc?.elementFromPoint(x, y);
  if (!doc || !target) return activateBreakpoint(bp, null);
  target.dispatchEvent(new (doc.defaultView as Window & typeof globalThis).MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y, view: doc.defaultView }));
}

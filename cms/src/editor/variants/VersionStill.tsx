import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Breakpoint } from "../../schema";
import { activateBreakpoint } from "../board/bridge";
import { clickThrough, StillCanvas } from "../board/FrameStill";
import { captureWhenQuiet } from "../board/stills";
import { openVersion } from "./actions";

/**
 * A still picture over a variant's frame beside the page, like the page's own frames that aren't
 * being edited (see board/stills.ts). Without it every variant frame was a live page redrawn on
 * each zoom step, which brought the board's flicker back once variants sat beside the page.
 *
 * The picture is retaken a moment after anything it shows changes (`stamp`), only while the frame
 * is drawn (`ready`), and never while the board moves. A click lands on the live page under it,
 * which opens that version on that block.
 */
export function VersionStill({ doc, ready, stamp, bp, pageId }: { doc: Document | null; ready: boolean; stamp: number; bp: Breakpoint; pageId: string }) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const taken = useRef(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc || !ready || taken.current === stamp) return;
    let live = true;
    const t = setTimeout(() => {
      void captureWhenQuiet(doc).then((shot) => {
        if (!live || !shot) return;
        taken.current = stamp;
        setCanvas(shot.canvas);
      });
    }, 1200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [doc, ready, stamp]);

  // The live page under a picture isn't drawn at all (that's the saving).
  useLayoutEffect(() => {
    const frame = ref.current?.parentElement;
    frame?.classList.add("is-still");
    return () => frame?.classList.remove("is-still");
  }, [canvas]);

  if (!canvas) return null;
  return (
    <div
      ref={ref}
      className="bd-still"
      aria-hidden="true"
      onClick={(e) =>
        clickThrough(bp, e.currentTarget, e.clientX, e.clientY, () => {
          openVersion(pageId);
          activateBreakpoint(bp, null);
        })
      }
    >
      <StillCanvas canvas={canvas} />
    </div>
  );
}

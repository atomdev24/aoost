import { lazy, Suspense } from "react";
import { play, usePlaying } from "./play-store";
import "./play.css";

const PlayView = lazy(() => import("./PlayView").then((m) => ({ default: m.PlayView })));

/**
 * Play, above a frame: the page (or variant) at that screen size, moving as visitors will see
 * it (the board itself holds still). From the draft, so nothing needs publishing or picking.
 */
export function PlayButton({ pageId, bp }: { pageId: string; bp: string }) {
  return (
    <button type="button" className="bd-play" aria-label="Play: see it moving" title="Play: see it moving, as visitors will" onPointerDown={(e) => e.stopPropagation()} onClick={() => play({ pageId, bp })}>
      <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" aria-hidden="true">
        <path d="M4.5 2.6v10.8a.7.7 0 0 0 1.05.6l8.6-5.4a.7.7 0 0 0 0-1.2l-8.6-5.4a.7.7 0 0 0-1.05.6Z" />
      </svg>
    </button>
  );
}

/** The player itself, mounted once in the editor; loads on first Play. */
export function PlayHost() {
  const playing = usePlaying();
  return playing ? (
    <Suspense fallback={null}>
      <PlayView playing={playing} />
    </Suspense>
  ) : null;
}

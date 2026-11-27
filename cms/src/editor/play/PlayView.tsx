import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BREAKPOINT_LABEL, type Breakpoint } from "../../schema";
import { DESIGN_WIDTH } from "../../schema/responsive";
import { SCREEN_HEIGHT } from "../board/frame-css";
import { megaItemId, flush, useEditor } from "../store";
import { play, type Playing } from "./play-store";

/**
 * The page playing at one screen size, over the board: the draft preview (/preview/<slug>), so
 * the page's own scripts run and everything moves as visitors will see it. Scaled down to fit the
 * window; Esc, the close button or a click outside closes it. The draft is saved first.
 */
export function PlayView({ playing }: { playing: NonNullable<Playing> }) {
  const site = useEditor((s) => s.site);
  const page = site.pages.find((p) => p.id === playing.pageId);
  const bp = playing.bp as Breakpoint;
  const w = DESIGN_WIDTH[bp] ?? 1440;
  const h = SCREEN_HEIGHT[bp] ?? 900;
  const [src, setSrc] = useState<string | null>(null);
  const [fit, setFit] = useState(1);
  const [reload, setReload] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let gone = false;
    const slug = !page || megaItemId(page.id) ? "/" : page.slug === "/" ? "/" : page.slug;
    void flush().then(() => !gone && setSrc(`/preview${slug}?play=${Date.now()}`));
    return () => void (gone = true);
  }, [page?.id, page?.slug, reload]);

  useLayoutEffect(() => {
    const size = () => {
      const room = { w: window.innerWidth - 64, h: window.innerHeight - 120 };
      setFit(Math.min(1, room.w / w, room.h / h));
    };
    size();
    window.addEventListener("resize", size);
    return () => window.removeEventListener("resize", size);
  }, [w, h]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && (e.preventDefault(), e.stopPropagation(), play(null));
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, []);

  const name = page ? (page.variantOf ? `${page.variantName ?? "Variant"} (variant of ${site.pages.find((p) => p.id === page.variantOf)?.title ?? "page"})` : page.title) : "Page";
  return createPortal(
    <div className="pl-backdrop" role="dialog" aria-modal="true" aria-label={`Playing ${name}`} onPointerDown={(e) => e.target === e.currentTarget && play(null)}>
      <div className="pl-head" style={{ width: Math.max(320, w * fit) }}>
        <span className="pl-dot" aria-hidden="true" />
        <strong>{name}</strong>
        <span className="pl-sub">
          {BREAKPOINT_LABEL[bp]} · {w}px · not published
        </span>
        <span className="pl-sp" />
        <button type="button" className="ed-btn ed-btn-sm" onClick={() => setReload((n) => n + 1)} title="Play it again from the top">
          Restart
        </button>
        <button type="button" className="ed-btn ed-btn-sm" onClick={() => play(null)} aria-label="Close" title="Close (Esc)">
          Close
        </button>
      </div>
      <div ref={box} className="pl-stage" style={{ width: w * fit, height: h * fit }}>
        {src ? <iframe key={src} className="pl-frame" src={src} title={`${name}, ${BREAKPOINT_LABEL[bp]}`} style={{ width: w, height: h, transform: `scale(${fit})` }} /> : <span className="pl-wait">Saving…</span>}
      </div>
    </div>,
    document.body,
  );
}

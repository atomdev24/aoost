import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { variantsOf } from "../../model/variants";
import type { Page } from "../../schema";
import { DEMO } from "../demo";
import { flush, setPage, useEditor } from "../store";
import { closeDesigns, setDesignsDone, useDesignsDone, useDesignsOpen } from "./designs-open";
import { chooseDesign, removeDesign } from "./templates";
import "./templates.css";

const W = 1440;
const GAP = 160;
const FIRST_H = 900;
const MAX_H = 9000;
const previewPath = (slug: string) => (slug === "/" ? "/" : `${slug}/`);

/** One design drawn at a desktop width, as tall as the page is (measured once it loads). */
function Artboard({ page, ready, x, height, onHeight, label, children }: { page: Page; ready: boolean; x: number; height: number; onHeight: (h: number) => void; label: string; children: React.ReactNode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const measure = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.documentElement) return;
    onHeight(Math.min(MAX_H, Math.max(FIRST_H, doc.documentElement.scrollHeight)));
  }, [onHeight]);
  return (
    <figure className="ed-dz-board" style={{ left: x, width: W }}>
      <figcaption className="ed-dz-label">
        <strong>{label}</strong>
        <span className="ed-dz-tools">{children}</span>
      </figcaption>
      <iframe
        ref={frame}
        title={label}
        src={ready ? `/preview${previewPath(page.slug)}` : "about:blank"}
        style={{ height }}
        tabIndex={-1}
        onLoad={() => {
          if (!ready) return;
          measure();
          // Pictures that load late can make the page longer.
          setTimeout(measure, 1200);
        }}
      />
    </figure>
  );
}

/**
 * The designs of one page side by side on an endless board: drag or scroll to
 * move around, pinch or ⌘-scroll to zoom. "Use this one" puts that design on
 * the page, removes the rest and sends the draft to staging, whose link is
 * ready to share.
 */
export function DesignsBoard() {
  const pageId = useDesignsOpen();
  const site = useEditor((s) => s.site);
  const page = site.pages.find((p) => p.id === pageId);
  const designs = page ? variantsOf(site, page.id) : [];
  const all = page ? [page, ...designs] : [];
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [view, setView] = useState({ x: 40, y: 90, k: 0.25 });
  const [busy, setBusy] = useState<string | null>(null);
  const done = useDesignsDone();
  const [copied, setCopied] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  // The previews read the saved draft: save first, then load them.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!pageId) return;
    setReady(false);
    void flush().finally(() => setReady(true));
  }, [pageId, all.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const viewRef = useRef(view);
  viewRef.current = view;

  const worldW = all.length * W + (all.length - 1) * GAP;
  const worldH = Math.max(FIRST_H, ...all.map((p) => heights[p.id] ?? FIRST_H));
  const fit = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    const k = Math.max(0.05, Math.min(1, (el.clientWidth - 80) / worldW, Math.max(200, el.clientHeight - 100) / Math.min(worldH, 2600)));
    setView({ k, x: (el.clientWidth - worldW * k) / 2, y: 64 });
  }, [worldW, worldH]);
  // Fit once when it opens and whenever the number of designs changes.
  useLayoutEffect(fit, [all.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pageId) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeDesigns();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [pageId]);

  // Scroll pans; pinch (ctrl + wheel) or ⌘ + scroll zooms around the pointer.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        const k = Math.min(2, Math.max(0.05, v.k * Math.exp(-e.deltaY * 0.01)));
        setView({ k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k });
      } else setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [pageId]);

  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button,a,input")) return;
    const start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    el.classList.add("is-grabbing");
    const move = (m: PointerEvent) => setView((v) => ({ ...v, x: start.vx + m.clientX - start.x, y: start.vy + m.clientY - start.y }));
    const up = () => {
      el.classList.remove("is-grabbing");
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const choose = async (id: string | null, name: string) => {
    if (!page) return;
    setBusy(id ?? page.id);
    const link = await chooseDesign(page.id, id);
    setBusy(null);
    setDesignsDone({ name, link, at: Date.now() });
  };

  if (!pageId) return null;
  if (!page) {
    closeDesigns();
    return null;
  }
  return (
    <div className="ed-dz" role="dialog" aria-modal="true" aria-label={`Designs for ${page.title}`}>
      <header className="ed-dz-head">
        <strong>Designs for {page.title}</strong>
        <span className="ed-dz-hint">Drag or scroll to move around · pinch or ⌘-scroll to zoom</span>
        <span className="ed-compare-spacer" />
        <button type="button" className="ed-btn ed-btn-sm" onClick={() => setView((v) => ({ ...v, k: Math.max(0.05, v.k / 1.25) }))} aria-label="Zoom out">
          −
        </button>
        <span className="ed-dz-zoom">{Math.round(view.k * 100)}%</span>
        <button type="button" className="ed-btn ed-btn-sm" onClick={() => setView((v) => ({ ...v, k: Math.min(2, v.k * 1.25) }))} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="ed-btn ed-btn-sm" onClick={fit}>
          Fit
        </button>
        <button type="button" className="ed-btn ed-btn-sm" onClick={closeDesigns}>
          Close
        </button>
      </header>
      {done ? (
        <div className="ed-dz-done" role="status">
          <span>
            <strong>{done.name}</strong> is on {page.title}
            {done.link ? (DEMO ? " and on a share link (it lasts until the demo resets at 03:00):" : " and on the staging link:") : ". Sending it to staging didn't work; try Elect again from the page."}
          </span>
          {done.link ? (
            <>
              <a href={done.link} target="_blank" rel="noopener">
                {done.link.replace(/^https?:\/\//, "")}
              </a>
              <button
                type="button"
                className="ed-btn ed-btn-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(done.link!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  } catch {
                    window.prompt("Copy the link:", done.link!);
                  }
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="ed-dz-stage" ref={stage} onPointerDown={drag}>
        <div className="ed-dz-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, width: worldW, height: worldH, ["--inv" as string]: String(1 / view.k) }}>
          {all.map((p, i) => {
            const original = p.id === page.id;
            const name = original ? `${page.title} as it is` : (p.variantName ?? "Design");
            return (
              <Artboard key={`${p.id}-${done?.at ?? 0}`} page={p} ready={ready} x={i * (W + GAP)} height={heights[p.id] ?? FIRST_H} onHeight={(h) => setHeights((m) => (m[p.id] === h ? m : { ...m, [p.id]: h }))} label={name}>
                <button type="button" className="ed-btn ed-btn-variant" disabled={!!busy || (original && !designs.length)} onClick={() => void choose(original ? null : p.id, name)}>
                  {busy === p.id ? "Working…" : original ? "Keep this one" : "Use this one"}
                </button>
                <button
                  type="button"
                  className="ed-btn"
                  onClick={() => {
                    setPage(p.id);
                    closeDesigns();
                  }}
                >
                  Edit
                </button>
                {!original ? (
                  <button type="button" className="ed-btn" onClick={() => removeDesign(p.id)}>
                    Remove
                  </button>
                ) : null}
              </Artboard>
            );
          })}
        </div>
      </div>
    </div>
  );
}

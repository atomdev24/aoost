import { useEffect, useRef, useState } from "react";
import { closeCompare, useCompare } from "./compare";

const WIDTHS = { Desktop: 1440, Mobile: 390 } as const;
type Size = keyof typeof WIDTHS;

/** One render, drawn at a real screen width and scaled down to fit its half. */
function Pane({ label, src, size, frameRef, onLoad }: { label: string; src: string; size: Size; frameRef: (el: HTMLIFrameElement | null) => void; onLoad: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFit({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const width = WIDTHS[size];
  const scale = Math.min(1, fit.w / width);
  return (
    <figure className="ed-compare-pane">
      <figcaption>{label}</figcaption>
      <div className="ed-compare-stage" ref={box}>
        <iframe
          ref={frameRef}
          title={label}
          src={src}
          onLoad={onLoad}
          style={{ width, height: fit.h / scale, transform: `scale(${scale})`, left: Math.max(0, (fit.w - width * scale) / 2) }}
        />
      </div>
    </figure>
  );
}

/**
 * Compare: two pages side by side (a variant and the live page, or a past
 * version and the live page) that scroll together, with what changed listed
 * underneath and the next step (Elect, Restore) at hand.
 */
export function CompareView() {
  const spec = useCompare();
  const [size, setSize] = useState<Size>("Desktop");
  const frames = useRef<(HTMLIFrameElement | null)[]>([null, null]);
  const syncing = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!spec) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeCompare();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [spec]);

  // Scroll one side, the other follows to the same place (by proportion: the pages may differ in length).
  const link = (i: number) => () => {
    const win = frames.current[i]?.contentWindow;
    if (!win) return;
    win.addEventListener(
      "scroll",
      () => {
        if (syncing.current) return;
        const other = frames.current[1 - i]?.contentWindow;
        if (!other) return;
        const from = win.document.documentElement;
        const to = other.document.documentElement;
        const ratio = from.scrollHeight > win.innerHeight ? win.scrollY / (from.scrollHeight - win.innerHeight) : 0;
        syncing.current = true;
        other.scrollTo(0, ratio * Math.max(0, to.scrollHeight - other.innerHeight));
        requestAnimationFrame(() => (syncing.current = false));
      },
      { passive: true },
    );
  };

  if (!spec) return null;
  const count = spec.changes.reduce((n, g) => n + g.items.length, 0);
  return (
    <div className="ed-compare" role="dialog" aria-modal="true" aria-label={spec.title}>
      <header className="ed-compare-head">
        <strong>{spec.title}</strong>
        <div className="ed-compare-seg" role="group" aria-label="Screen size">
          {(Object.keys(WIDTHS) as Size[]).map((s) => (
            <button key={s} type="button" className={`ed-compare-seg-btn${s === size ? " is-on" : ""}`} aria-pressed={s === size} onClick={() => setSize(s)}>
              {s}
            </button>
          ))}
        </div>
        <span className="ed-compare-spacer" />
        {spec.action ? (
          <button
            type="button"
            className="ed-btn ed-btn-sm ed-btn-variant"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await spec.action!.run();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : spec.action.label}
          </button>
        ) : null}
        <button type="button" className="ed-btn ed-btn-sm" onClick={closeCompare}>
          Close
        </button>
      </header>
      <div className="ed-compare-panes">
        <Pane key={`l-${size}`} label={spec.left.label} src={spec.left.src} size={size} frameRef={(el) => (frames.current[0] = el)} onLoad={link(0)} />
        <Pane key={`r-${size}`} label={spec.right.label} src={spec.right.src} size={size} frameRef={(el) => (frames.current[1] = el)} onLoad={link(1)} />
      </div>
      <section className="ed-compare-changes" aria-label="What changed">
        <strong>{count ? `${count} ${count === 1 ? "change" : "changes"}` : "No differences"}</strong>
        {spec.changes.map((g) => (
          <p key={g.title}>
            <span className="ed-sheet-page">{g.title}</span> <span className="ed-sheet-items">{g.items.join(", ")}</span>
          </p>
        ))}
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEMO_LIMITS, demoStrip } from "../demo/limits";

/**
 * The demo editor's chip in the top bar and a thin strip under it: the strip always says what's
 * off, and the chip (or Details on the strip) opens the full list and "Reset demo". Controls that
 * are off carry their own lock (demo/DemoLock.tsx).
 */
export function DemoBar() {
  const [open, setOpen] = useState(false);
  const [resetEvery, setResetEvery] = useState("nightly");
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json() as Promise<{ reset?: string }>)
      .then((r) => r.reset && setResetEvery(r.reset))
      .catch(() => {});
  }, []);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // a click on the canvas (its own frame) takes the focus away from this window
    const blur = () => setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("blur", blur);
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const reset = async () => {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/editor/demo/reset", { method: "POST", credentials: "same-origin" });
      if (!res.ok) throw new Error();
      setNote("The demo is back to its sample site.");
    } catch {
      setNote("Couldn't reset the demo. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ed-demo" ref={box}>
      {/* On the page itself: the top bar's frosted glass would otherwise hold a fixed strip inside it. */}
      {createPortal(
        <div className="ed-demo-strip" role="note">
          <span>{demoStrip(resetEvery)}</span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpen(true)}
          >
            Details
          </button>
        </div>,
        document.body,
      )}
      <button type="button" className="ed-demo-chip" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        Demo
      </button>
      {open ? (
        <div className="ed-demo-card" role="dialog" aria-label="About this demo">
          <h2>This is a demo editor</h2>
          <p>Everything else works on a sample site, so try it freely. Nothing here touches a real website.</p>
          <ul className="ed-demo-limits">
            {Object.values(DEMO_LIMITS).map((l) => (
              <li key={l.title}>
                <b>{l.title}</b> {l.why}
              </li>
            ))}
          </ul>
          <div className="ed-demo-actions">
            <button type="button" className="ed-btn ed-btn-sm" disabled={busy} onClick={() => void reset()}>
              {busy ? "Resetting…" : "Reset demo"}
            </button>
            <button type="button" className="ed-btn ed-btn-sm ed-btn-primary" onClick={() => setOpen(false)}>
              Got it
            </button>
          </div>
          {note ? (
            <p className="ed-demo-note" role="status">
              {note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

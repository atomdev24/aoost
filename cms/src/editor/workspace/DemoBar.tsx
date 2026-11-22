import { useEffect, useRef, useState } from "react";

/**
 * The demo editor's chip in the top bar: says this is a sample site, what's real and what isn't,
 * and puts everything back with "Reset demo". Opens once by itself on a first visit.
 */
const SEEN = "ed-demo-seen";

export function DemoBar() {
  const [open, setOpen] = useState(() => {
    try {
      return !sessionStorage.getItem(SEEN);
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {
      /* private mode */
    }
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
      <button type="button" className="ed-demo-chip" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        Demo
      </button>
      {open ? (
        <div className="ed-demo-card" role="dialog" aria-label="About this demo">
          <h2>This is a demo editor</h2>
          <p>Everything works on a sample site, so you can try it freely. Nothing here touches a real website.</p>
          <ul>
            <li>Anyone with the link can edit this demo at the same time.</li>
            <li>Publish and Push to production only pretend.</li>
            <li>Uploads are off: use the placeholder pictures.</li>
            <li>It goes back to the sample site every night.</li>
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

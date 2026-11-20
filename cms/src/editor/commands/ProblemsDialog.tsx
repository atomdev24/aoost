import { useEffect, useState } from "react";
import type { StoredProblem } from "../../model/problems";
import { clearProblems, closeProblems, loadProblems, loadProblemsText, openProblemLog, sendReport, useProblemsDialog } from "../problems";

const KIND_LABEL: Record<StoredProblem["kind"], string> = { error: "Error", request: "Request failed", connection: "Connection", stall: "Freeze", publish: "Publish", report: "Report" };

/**
 * Report a problem (in your own words; the editor adds where you were) and the problem log
 * (what the editor noticed going wrong, newest first, with Copy all for a message or for Claude).
 */
export function ProblemsDialog() {
  const open = useProblemsDialog();
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      closeProblems();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [open]);
  if (!open) return null;
  return (
    <div className="ed-pal-backdrop ed-cheat-backdrop" onPointerDown={(e) => e.target === e.currentTarget && closeProblems()}>
      <div className="ed-cheat ed-problems" role="dialog" aria-modal="true" aria-label={open === "report" ? "Report a problem" : "Problem log"}>
        <header className="ed-cheat-head">
          <strong>{open === "report" ? "Report a problem" : "Problem log"}</strong>
          <button type="button" className="ed-mini" aria-label="Close" onClick={closeProblems}>
            ✕
          </button>
        </header>
        {open === "report" ? <Report /> : <Log />}
      </div>
    </div>
  );
}

function Report() {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <div className="ed-problems-body">
        <p>Saved to the problem log, with the page, screen size, zoom and browser you were on.</p>
        <div className="ed-problems-actions">
          <button type="button" className="ed-btn" onClick={openProblemLog}>
            Open the problem log
          </button>
          <button type="button" className="ed-btn ed-btn-primary" onClick={closeProblems}>
            Done
          </button>
        </div>
      </div>
    );
  return (
    <form
      className="ed-problems-body"
      onSubmit={(e) => {
        e.preventDefault();
        void sendReport(text).then(() => setSent(true));
      }}
    >
      <label className="ed-field-label" htmlFor="problem-text">
        What happened? What were you doing just before?
      </label>
      <textarea id="problem-text" className="ed-input" rows={5} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Zooming out on the homepage, the inspector flickered and then disappeared." />
      <div className="ed-problems-actions">
        <button type="button" className="ed-btn" onClick={closeProblems}>
          Cancel
        </button>
        <button type="submit" className="ed-btn ed-btn-primary" disabled={!text.trim()}>
          Save report
        </button>
      </div>
    </form>
  );
}

function Log() {
  const [items, setItems] = useState<StoredProblem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    loadProblems()
      .then((list) => setItems([...list].reverse()))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load the problem log."));
  }, []);
  return (
    <div className="ed-problems-body">
      {error ? <p>{error}</p> : null}
      {items === null && !error ? <p className="ed-hint">Loading…</p> : null}
      {items && !items.length ? <p className="ed-hint">Nothing recorded. Problems the editor notices, and reports you save, show here.</p> : null}
      {items && items.length ? (
        <ol className="ed-problems-list">
          {items.map((p, i) => (
            <li key={`${p.t}-${i}`} data-kind={p.kind}>
              <div className="ed-problems-row">
                <span className="ed-problems-kind">{KIND_LABEL[p.kind]}</span>
                <time dateTime={new Date(p.t).toISOString()}>{new Date(p.t).toLocaleString()}</time>
              </div>
              <div className="ed-problems-msg">{p.message}</div>
              {p.context ? (
                <div className="ed-problems-ctx">
                  {[p.context.page, p.context.size, p.context.zoom != null ? `${p.context.zoom}%` : null, p.context.browser, p.who].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="ed-problems-actions">
        {items && items.length ? (
          <button
            type="button"
            className="ed-btn"
            onClick={() => {
              if (!window.confirm("Clear the whole problem log?")) return;
              void clearProblems().then(() => setItems([]));
            }}
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          className="ed-btn ed-btn-primary"
          disabled={!items?.length}
          onClick={() =>
            void loadProblemsText().then((t) =>
              navigator.clipboard.writeText(t).then(
                () => setCopied(true),
                () => setCopied(false),
              ),
            )
          }
        >
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
    </div>
  );
}

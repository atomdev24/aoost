import { useEffect, useMemo, useState } from "react";
import { summarizeChanges, type ChangeSummary } from "../../model/changes";
import { useEditor } from "../store";
import { closeSheet, publish, usePublish, type Step } from "./publish";

/** The unpublished changes, recounted shortly after edits settle. */
export function useChanges(): ChangeSummary | null {
  const site = useEditor((s) => s.site);
  const published = usePublish((s) => s.published);
  const [summary, setSummary] = useState<ChangeSummary | null>(null);
  useEffect(() => {
    if (!published) return;
    const t = setTimeout(() => setSummary(summarizeChanges(published, site)), 250);
    return () => clearTimeout(t);
  }, [site, published]);
  return published ? summary : null;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "github", label: "Saving to GitHub" },
  { id: "rebuild", label: "Rebuilding the site" },
  { id: "live", label: "Live on alexoostendurp.com" },
];

/**
 * The publish details sheet: "Publish N changes", which pages and blocks
 * changed, and the three real steps. When a publish fails it opens by itself
 * with the failed step in red, a plain message and Retry.
 */
export function PublishSheet() {
  const open = usePublish((s) => s.sheet);
  const phase = usePublish((s) => s.phase);
  const failed = usePublish((s) => s.failed);
  const error = usePublish((s) => s.error);
  const note = usePublish((s) => s.note);
  const changes = useChanges();
  const list = useMemo(() => changes?.pages ?? [], [changes]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeSheet();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [open]);
  if (!open) return null;
  const n = changes?.count ?? 0;
  const order: Step[] = ["github", "rebuild", "live"];
  const at: Step | null = phase === "github" ? "github" : phase === "rebuilding" ? "rebuild" : phase === "live" ? "live" : null;
  const stepState = (s: Step): "done" | "active" | "failed" | "todo" => {
    if (failed) return s === failed ? "failed" : order.indexOf(s) < order.indexOf(failed) ? "done" : "todo";
    if (phase === "live") return "done";
    if (!at) return "todo";
    return s === at ? "active" : order.indexOf(s) < order.indexOf(at) ? "done" : "todo";
  };
  const busy = phase === "github" || phase === "rebuilding";
  return (
    <section className="ed-sheet" role="dialog" aria-label="Publish details">
      <header className="ed-sheet-head">
        <strong>{phase === "live" ? "Published" : n ? `Publish ${n} ${n === 1 ? "change" : "changes"}` : "Nothing to publish"}</strong>
        <button type="button" className="ed-mini" aria-label="Close publish details" onClick={closeSheet}>
          ×
        </button>
      </header>
      {list.length ? (
        <ul className="ed-sheet-pages" aria-label="What changed">
          {list.map((p) => (
            <li key={p.id}>
              <span className="ed-sheet-page">{p.title}</span>
              <span className="ed-sheet-items">{p.items.join(", ")}</span>
            </li>
          ))}
        </ul>
      ) : phase !== "live" ? (
        <p className="ed-hint">The draft matches what is live.</p>
      ) : null}
      <ol className="ed-steps" aria-label="Publish steps">
        {STEPS.map((s) => {
          const st = stepState(s.id);
          return (
            <li key={s.id} className={`is-${st}`} data-step={s.id} aria-current={st === "active" ? "step" : undefined}>
              <span className="ed-step-mark" aria-hidden="true">
                {st === "done" ? "✓" : st === "failed" ? "!" : st === "active" ? <span className="ed-spinner" /> : ""}
              </span>
              <span>{s.label}</span>
              {st === "failed" ? <span className="ed-visually-hidden">failed</span> : null}
            </li>
          );
        })}
      </ol>
      {error ? (
        <p className="ed-sheet-error" role="alert">
          {error}
        </p>
      ) : null}
      {note ? <p className="ed-hint">{note}</p> : null}
      <footer className="ed-sheet-foot">
        {failed ? (
          <button type="button" className="ed-btn ed-btn-accent ed-btn-sm" onClick={() => void publish()}>
            Retry
          </button>
        ) : (
          <button type="button" className="ed-btn ed-btn-accent ed-btn-sm" disabled={busy || !n} onClick={() => void publish()}>
            {busy ? "Publishing…" : n ? `Publish ${n} ${n === 1 ? "change" : "changes"}` : "Publish"}
          </button>
        )}
      </footer>
    </section>
  );
}

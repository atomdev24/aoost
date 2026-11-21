import { useEffect, useMemo, useState } from "react";
import { summarizeChanges, type ChangeSummary } from "../../model/changes";
import { useEditor } from "../store";
import { closeSheet, publish, pushStaging, usePublish, type Step } from "./publish";
import { copyStagingLink, emptyStaging, sendToStaging, useStaging } from "./staging";
import { resolveConflict, useSync } from "./sync";

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
  const conflicts = useSync((s) => s.info.conflicts);
  const syncBusy = useSync((s) => s.busy);
  const syncError = useSync((s) => s.error);
  const list = useMemo(() => changes?.pages ?? [], [changes]);
  const staged = useStaging((s) => s.info);
  const stagingBusy = useStaging((s) => s.busy);
  const stagingError = useStaging((s) => s.error);
  const copied = useStaging((s) => s.copied);
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
      {conflicts.length ? (
        <>
          <p className="ed-hint">
            The live site changed {conflicts.length === 1 ? "a value" : `${conflicts.length} values`} you also changed. Your draft kept yours; choose for each:
          </p>
          <ul className="ed-sheet-conflicts" aria-label="Changed on both sides">
            {conflicts.map((c) => (
              <li key={c.id}>
                <span className="ed-conflict-label">{c.label}</span>
                <span className="ed-conflict-values">Mine: {c.draft}</span>
                <span className="ed-conflict-values">Live: {c.live}</span>
                <span className="ed-conflict-actions">
                  <button type="button" className="ed-btn ed-btn-sm" disabled={syncBusy} onClick={() => void resolveConflict(c.id, "live")}>
                    Use live
                  </button>
                  <button type="button" className="ed-btn ed-btn-sm" disabled={syncBusy} onClick={() => void resolveConflict(c.id, "mine")}>
                    Keep mine
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {syncError ? <p className="ed-sheet-error">{syncError}</p> : null}
        </>
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
      <section className="ed-staging" aria-label="Staging">
        <header className="ed-staging-head">
          <strong>Staging</strong>
          <span className="ed-hint">{staged ? `${staged.label} · ${ago(staged.at)}` : "Empty. Send the draft here to share a link before it goes live."}</span>
        </header>
        {staged ? (
          <>
            <div className="ed-staging-link">
              <input className="ed-input" readOnly value={staged.url} aria-label="Staging link" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="ed-btn ed-btn-sm" onClick={() => void copyStagingLink()}>
                {copied ? "Copied" : "Copy link"}
              </button>
              <a className="ed-btn ed-btn-sm" href={staged.url} target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
            <p className="ed-hint">Anyone with the link can see it, without signing in. Nothing is live until you push.</p>
            <div className="ed-staging-actions">
              <button type="button" className="ed-btn ed-btn-sm" disabled={stagingBusy || busy} onClick={() => void emptyStaging()}>
                Empty staging
              </button>
              <button type="button" className="ed-btn ed-btn-sm ed-btn-variant" disabled={stagingBusy || busy} onClick={() => void pushStaging()}>
                Push to production
              </button>
            </div>
          </>
        ) : null}
        {stagingError ? <p className="ed-sheet-error">{stagingError}</p> : null}
      </section>
      <footer className="ed-sheet-foot">
        <button type="button" className="ed-btn ed-btn-sm" disabled={stagingBusy || busy} onClick={() => void sendToStaging()}>
          {stagingBusy ? "Sending…" : staged ? "Update staging" : "Send to staging"}
        </button>
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

function ago(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(at).toLocaleDateString();
}

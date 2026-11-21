import { useEffect, useState } from "react";
import { restoreVersion } from "../../model/versions";
import { api, ApiError, type Version } from "../api";
import { flush, getState, update, useEditor } from "../store";
import { openSheet } from "../workspace/publish";
import { sendToStaging } from "../workspace/staging";

/** "Publish from the editor: content/pages/home.json" → "Published Home"; "Push to production: Home: Variant 1" → "Pushed Home: Variant 1". */
function describe(v: Version, titles: Map<string, string>): string {
  const pushed = /^Push to production(?::\s*(.+))?$/.exec(v.message);
  if (pushed) return pushed[1] ? `Pushed ${pushed[1]}` : "Pushed from staging";
  const published = /^Publish from the editor: (.+)$/.exec(v.message);
  if (published) {
    const what = published[1]!;
    const page = /^content\/pages\/([^/]+)\.json$/.exec(what);
    if (page) return `Published ${titles.get(page[1]!) ?? page[1]}`;
    if (what === "content/site.json") return "Published site settings";
    if (what === "content/collections.json") return "Published diary and playlists";
    return `Published ${what}`;
  }
  return v.message;
}

function when(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${time}`;
}

/**
 * Version history: every publish and push to production, newest first. Preview
 * shows a version exactly as it was; Restore puts it in the draft (⌘Z undoes it)
 * and sends it to staging, so nothing goes live until it is pushed.
 */
export function HistoryPanel() {
  const pages = useEditor((s) => s.site.pages);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const titles = new Map(pages.map((p) => [p.id, p.title]));

  const load = async () => {
    setError(null);
    try {
      const r = await api.history();
      setVersions(r.versions);
      setUnavailable(r.unavailable ?? null);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Couldn't load the history.");
    }
  };
  useEffect(() => void load(), []);

  const restore = async (v: Version) => {
    const label = `${describe(v, titles)}, ${when(v.at)}`;
    if (getState().unpublished && !window.confirm(`Restore "${label}"?\n\nThe draft has unpublished changes; restoring replaces them (⌘Z undoes it). It then goes to staging, not live.`)) return;
    setBusy(v.sha);
    setError(null);
    setNote(null);
    try {
      if (!(await flush())) throw new Error("The draft couldn't be saved first.");
      const old = (await api.version(v.sha)).site;
      const { site, droppedVariants } = restoreVersion(getState().site, old);
      update(() => site, `Restore ${label}`);
      if (droppedVariants.length) setNote(`Left out ${droppedVariants.length === 1 ? "a variant" : `${droppedVariants.length} variants`} whose page isn't in that version: ${droppedVariants.join(", ")}.`);
      if (await sendToStaging(`Restore: ${label}`)) openSheet();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Restoring failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="ed-panel ed-versions">
      <p className="ed-panel-note">Every publish and push to production. Restore puts a version in staging first, so you can check and share it before pushing it live.</p>
      {error ? <p className="ed-sheet-error">{error}</p> : null}
      {note ? <p className="ed-hint">{note}</p> : null}
      {unavailable ? <p className="ed-hint">{unavailable}</p> : null}
      {!versions && !error ? <p className="ed-hint">Loading the history…</p> : null}
      {versions?.length ? (
        <ol className="ed-history-list" aria-label="Versions">
          {versions.map((v, i) => (
            <li key={v.sha} className={`ed-history-item${i === 0 ? " is-live" : ""}`}>
              <div className="ed-history-text">
                <span className="ed-history-title">
                  {describe(v, titles)}
                  {i === 0 ? <em>Live</em> : null}
                </span>
                <span className="ed-history-meta">
                  {when(v.at)}
                  {v.who ? ` · ${v.who}` : ""} · {v.sha.slice(0, 7)}
                </span>
              </div>
              <div className="ed-history-actions">
                <a className="ed-btn ed-btn-sm" href={`/preview/_version/${v.sha}/`} target="_blank" rel="noreferrer" aria-label={`Preview the version from ${when(v.at)}`}>
                  Preview
                </a>
                {i > 0 ? (
                  <button type="button" className="ed-btn ed-btn-sm" disabled={!!busy} aria-label={`Restore the version from ${when(v.at)}`} onClick={() => void restore(v)}>
                    {busy === v.sha ? "Restoring…" : "Restore"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : versions && !unavailable ? (
        <p className="ed-hint">Nothing has been published yet.</p>
      ) : null}
    </div>
  );
}

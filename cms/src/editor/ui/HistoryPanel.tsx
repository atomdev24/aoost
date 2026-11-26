import { useEffect, useState } from "react";
import { dayLabel, initials } from "./history-format";
import { summarizeChanges } from "../../model/changes";
import { restoreVersion } from "../../model/versions";
import { closeCompare, openCompare } from "../workspace/compare";
import { getPublish, loadPublished } from "../workspace/publish";
import { ownerPage } from "../../model/variants";
import { currentPage } from "../store";
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

const clock = (at: string) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/** What kind of step a version was, as a chip: Published, Pushed or Restored. */
const kindOf = (v: Version) => (/^Push to production/.test(v.message) ? "Pushed live" : /^Restore/.test(v.message) ? "Restored" : /^Publish/.test(v.message) ? "Published" : "Saved");

/**
 * Version history: every publish and push to production, newest first. Preview
 * shows a version exactly as it was; Restore puts it in the draft (⌘Z undoes it)
 * and sends it to staging, so nothing goes live until it is pushed. Grouped by day, one card per
 * version with who and when; the live one is outlined green (UI spec, Nov 2026).
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

  /** This version of the page on screen beside the live one, with everything the version changes across the site. */
  const compare = async (v: Version) => {
    setBusy(v.sha);
    setError(null);
    try {
      const page = ownerPage(getState().site, currentPage(getState()));
      if (!getPublish().published) await loadPublished();
      const old = (await api.version(v.sha)).site;
      const live = getPublish().published;
      const diff = live ? summarizeChanges(live, old) : { pages: [] };
      const path = page.slug === "/" ? "/" : `${page.slug}/`;
      openCompare({
        title: `${describe(v, titles)}, ${when(v.at)}, compared with live`,
        left: { label: `Live: ${page.title}`, src: `/preview/_live${path}` },
        right: { label: `${page.title} in that version (${v.sha.slice(0, 7)})`, src: `/preview/_version/${v.sha}${path}` },
        changes: diff.pages.map((p) => ({ title: p.title, items: p.items })),
        action: {
          label: "Restore this version",
          run: async () => {
            closeCompare();
            await restore(v);
          },
        },
      });
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Couldn't compare that version.");
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
        <div className="ed-hdays">
          {versions
            .reduce<{ day: string; items: { v: Version; i: number }[] }[]>((days, v, i) => {
              const day = dayLabel(v.at);
              const last = days[days.length - 1];
              if (last?.day === day) last.items.push({ v, i });
              else days.push({ day, items: [{ v, i }] });
              return days;
            }, [])
            .map(({ day, items }) => (
              <section key={day} className="ed-hday">
                <h4 className="ed-hday-title">{day}</h4>
                <ol className="ed-history-list" aria-label={`Versions, ${day}`}>
                  {items.map(({ v, i }) => (
                    <li key={v.sha} className={`ed-hcard${i === 0 ? " is-live" : ""}`}>
                      <div className="ed-hcard-top">
                        <span className="ed-avatar" title={v.who ?? "Unknown"} aria-hidden="true">
                          {initials(v.who)}
                        </span>
                        <span className="ed-hcard-who">
                          {v.who ? v.who.split("@")[0] : "Someone"} · {clock(v.at)}
                        </span>
                        {i === 0 ? <span className="ed-pbadge is-live">Live</span> : null}
                      </div>
                      <div className="ed-hcard-title">{describe(v, titles)}</div>
                      <div className="ed-hcard-chips">
                        <span className="ed-hchip">{kindOf(v)}</span>
                        <span className="ed-hchip ed-hchip-sha" title="Version id">
                          {v.sha.slice(0, 7)}
                        </span>
                      </div>
                      <div className="ed-history-actions">
                        {i > 0 ? (
                          <button type="button" className="ed-hlink" disabled={!!busy} aria-label={`See what changed in the version from ${when(v.at)}, compared with live`} onClick={() => void compare(v)}>
                            ▸ See what changed
                          </button>
                        ) : null}
                        <span className="ed-hcard-spacer" />
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
              </section>
            ))}
        </div>
      ) : versions && !unavailable ? (
        <p className="ed-hint">Nothing has been published yet.</p>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import type { ActivityEntry } from "../../model/protocol";
import { onServerMessage } from "../socket";
import { setPage, useEditor } from "../store";

/** What has happened in the editor lately: edits (folded per person), comments and publishes. */
const when = (at: number) => {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const ICON: Record<ActivityEntry["kind"], string> = { edit: "✎", comment: "💬", publish: "↑" };

export function ActivityList() {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [problem, setProblem] = useState("");
  const pages = useEditor((s) => s.site.pages);

  useEffect(() => {
    let live = true;
    fetch("/api/editor/activity", { credentials: "same-origin" })
      .then((r) => r.json() as Promise<{ ok: boolean; entries?: ActivityEntry[]; error?: string }>)
      .then((d) => {
        if (!live) return;
        if (!d.ok) throw new Error(d.error ?? "Couldn't load the activity.");
        setEntries((d.entries ?? []).slice().sort((a, b) => b.at - a.at));
      })
      .catch((e: Error) => live && setProblem(e.message));
    const off = onServerMessage((msg) => {
      if (msg.type !== "activity") return;
      setEntries((list) => [msg.entry, ...(list ?? []).filter((x) => x.id !== msg.entry.id)]);
    });
    return () => {
      live = false;
      off?.();
    };
  }, []);

  if (problem) return <p className="ed-hint">{problem}</p>;
  if (!entries) return <p className="ed-hint">Loading activity…</p>;
  if (!entries.length) return <p className="ed-hint">Nothing yet. Edits, comments and publishes will show up here.</p>;
  return (
    <ul className="ed-activity" aria-label="Recent activity">
      {entries.map((e) => {
        const page = e.pageId ? pages.find((p) => p.id === e.pageId) : undefined;
        return (
          <li key={e.id} className={`is-${e.kind}`}>
            <span className="ed-activity-icon" aria-hidden="true">
              {ICON[e.kind]}
            </span>
            <div>
              <p>
                <b>{e.by}</b> {e.text}
                {e.count && e.count > 1 ? <span className="ed-sub"> · {e.count} changes</span> : null}
              </p>
              <p className="ed-sub">
                {when(e.at)}
                {page ? (
                  <>
                    {" · "}
                    <button type="button" className="ed-link" onClick={() => setPage(page.id)}>
                      {page.title}
                    </button>
                  </>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

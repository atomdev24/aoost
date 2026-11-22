import { useEffect, useMemo, useState } from "react";
import { lastActivity, type CommentThread } from "../../model/comments";
import { BREAKPOINT_LABEL } from "../../schema";
import { useEditor } from "../store";
import { goToThread } from "./CommentLayer";
import { setCommentMode } from "./mode";
import { COLORS, getAuthor, isUnread, setAuthor, setShowResolved, startComments, useComments } from "./store";

/**
 * The Comments panel: every thread on the site, open or resolved, grouped by page and what it's
 * about. Filters for this page, unread, the ones for you (you started, replied or were @mentioned)
 * and phone-only. Picking one goes to it on the canvas.
 */
type Filter = "page" | "unread" | "mine" | "phone";

export function CommentsPanel() {
  const threads = useComments((s) => s.threads);
  const loaded = useComments((s) => s.loaded);
  const seen = useComments((s) => s.seen);
  const showResolved = useComments((s) => s.showResolved);
  const pages = useEditor((s) => s.site.pages);
  const pageId = useEditor((s) => s.pageId);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [author, setA] = useState(getAuthor());
  const [editing, setEditing] = useState(false);
  useEffect(() => startComments(), []);

  const me = author?.name;
  const mine = (t: CommentThread) => !!me && (t.messages.some((m) => m.by.name === me) || t.messages.some((m) => m.text.toLowerCase().includes(`@${me.toLowerCase()}`)));
  const list = useMemo(
    () =>
      threads
        .filter((t) => t.status === tab)
        .filter((t) => !filters.has("page") || t.pageId === pageId)
        .filter((t) => !filters.has("unread") || isUnread(t, seen, me))
        .filter((t) => !filters.has("mine") || mine(t))
        .filter((t) => !filters.has("phone") || t.bp === "mobile")
        .sort((a, b) => lastActivity(b) - lastActivity(a)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, tab, filters, pageId, seen, me],
  );
  const groups = useMemo(() => {
    const m = new Map<string, CommentThread[]>();
    for (const t of list) m.set(t.pageId, [...(m.get(t.pageId) ?? []), t]);
    return [...m];
  }, [list]);
  const counts = { open: threads.filter((t) => t.status === "open").length, resolved: threads.filter((t) => t.status === "resolved").length };
  const toggle = (f: Filter) => setFilters((s) => (s.has(f) ? new Set([...s].filter((x) => x !== f)) : new Set([...s, f])));
  const pageName = (id: string) => pages.find((p) => p.id === id)?.title ?? "A deleted page";

  return (
    <div className="ed-panel ed-cmts">
      <div className="ed-cmts-tabs" role="tablist" aria-label="Open or resolved">
        <button type="button" role="tab" aria-selected={tab === "open"} onClick={() => setTab("open")}>
          Open · {counts.open}
        </button>
        <button type="button" role="tab" aria-selected={tab === "resolved"} onClick={() => setTab("resolved")}>
          Resolved · {counts.resolved}
        </button>
      </div>
      <div className="ed-cmts-filters" role="group" aria-label="Filters">
        {(
          [
            ["page", "This page"],
            ["unread", "Unread"],
            ["mine", "For me"],
            ["phone", "Phone only"],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button key={f} type="button" className={`ed-chip${filters.has(f) ? " is-on" : ""}`} aria-pressed={filters.has(f)} onClick={() => toggle(f)}>
            {label}
          </button>
        ))}
      </div>
      <label className="ed-cmts-check">
        <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved pins on the canvas
      </label>
      {!loaded ? (
        <p className="ed-hint">Loading comments…</p>
      ) : !list.length ? (
        <div className="ed-cmts-empty">
          <p className="ed-hint">{tab === "open" ? (threads.length ? "Nothing matches these filters." : "No comments yet.") : "Nothing resolved yet."}</p>
          {tab === "open" ? (
            <button type="button" className="ed-btn ed-btn-sm" onClick={() => setCommentMode(true)}>
              Add a comment (C)
            </button>
          ) : null}
        </div>
      ) : (
        groups.map(([page, items]) => (
          <section key={page} className="ed-cmts-group" aria-label={pageName(page)}>
            <h3>{pageName(page)}</h3>
            <ul>
              {items.map((t) => {
                const first = t.messages[0]!;
                const last = t.messages.at(-1)!;
                const unread = isUnread(t, seen, me);
                return (
                  <li key={t.id}>
                    <button type="button" className={`ed-cmts-item${unread ? " is-new" : ""}`} onClick={() => goToThread(t)}>
                      <span className="ed-cmt-av" style={{ background: first.by.color }} aria-hidden="true">
                        {first.by.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="ed-cmts-body">
                        <span className="ed-cmts-meta">
                          <b>{first.by.name}</b> · {t.label} · {BREAKPOINT_LABEL[t.bp]}
                          {t.messages.length > 1 ? ` · ${t.messages.length - 1} ${t.messages.length === 2 ? "reply" : "replies"}` : ""}
                        </span>
                        <span className="ed-cmts-snippet">{(t.messages.length > 1 ? `${last.by.name}: ${last.text}` : first.text).slice(0, 120)}</span>
                      </span>
                      {unread ? <span className="ed-cmts-dot" aria-label="new" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
      <footer className="ed-cmts-foot">
        {author && !editing ? (
          <span>
            Commenting as{" "}
            <b style={{ color: author.color }}>{author.name}</b> ·{" "}
            <button type="button" className="ed-linkbtn" onClick={() => setEditing(true)}>
              change
            </button>
          </span>
        ) : (
          <NameForm
            initial={author}
            onDone={() => {
              setA(getAuthor());
              setEditing(false);
            }}
          />
        )}
      </footer>
    </div>
  );
}

function NameForm({ initial, onDone }: { initial: { name: string; color: string } | null; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]!);
  return (
    <form
      className="ed-cmt-gate"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setAuthor(name, color);
        onDone();
      }}
    >
      <label htmlFor="ed-cmts-name">Your name and colour on comments</label>
      <div className="ed-cmt-row">
        <input id="ed-cmts-name" className="ed-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <button type="submit" className="ed-btn ed-btn-accent ed-btn-sm" disabled={!name.trim()}>
          Save
        </button>
      </div>
      <div className="ed-cmt-colors" role="radiogroup" aria-label="Colour">
        {COLORS.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className="ed-cmt-swatch" style={{ background: c }} onClick={() => setColor(c)} />
        ))}
      </div>
    </form>
  );
}

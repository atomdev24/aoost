import { completeMention, mentionQuery, teamPeople } from "../team/mentions";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { getComponent } from "../../components/registry";
import type { CommentThread } from "../../model/comments";
import { locate } from "../../model/page-ops";
import { BREAKPOINT_LABEL, type Breakpoint } from "../../schema";
import { frameOrigin, getBoard, revealRect } from "../board/store";
import { pieceAtPoint } from "../canvas/ResizePiece";
import { nodeSlots, samePath } from "../canvas/slots";
import { currentPage, getState, setBreakpoint, setPage, useEditor } from "../store";
import { isCommentMode, setCanvasCommentHandler, setCommentMode, useCommentMode } from "./mode";
import { getAuthor, getComments, isUnread, newId, openThread, send, setAuthor, startComments, startDraft, useComments } from "./store";

/**
 * Comments on the canvas: pins on the editable frame, the open thread beside its pin, and the box
 * for a new comment. A pin is tied to its block (or the piece inside it), so it follows the block.
 */

const frameDoc = () => document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument ?? null;

/** What a thread is attached to, in the editable frame. */
function anchorEl(doc: Document, t: { pageId: string; nodeId: string; path?: (string | number)[] }): Element | null {
  const block = doc.querySelector(`[data-node-id="${CSS.escape(t.nodeId)}"]`);
  if (!block || !t.path?.length) return block;
  const page = currentPage(getState());
  const at = locate(page, t.nodeId);
  const slot = at?.kind === "node" ? nodeSlots(at.node).find((s) => s.box && samePath(s.path, t.path!)) : null;
  return (slot && block.querySelector(slot.box!)) || block;
}

/** Frame pixels → the board's screen pixels. */
const toScreen = (bp: Breakpoint, x: number, y: number) => {
  const { view } = getBoard();
  const o = frameOrigin(bp);
  return { x: (o.x + x) * view.zoom + view.x, y: (o.y + y) * view.zoom + view.y };
};

/** Bring a thread into view: its page, its screen size, then its spot on the board. */
export function goToThread(t: CommentThread) {
  if (getState().pageId !== t.pageId) setPage(t.pageId);
  setBreakpoint(t.bp);
  openThread(t.id);
  let tries = 0;
  const look = () => {
    const doc = frameDoc();
    const el = doc && anchorEl(doc, t);
    if (!el) return void (++tries < 40 && setTimeout(look, 100));
    const r = el.getBoundingClientRect();
    const o = frameOrigin(t.bp);
    revealRect({ x: o.x + r.left, y: o.y + r.top, w: r.width, h: Math.min(r.height, 600) });
  };
  setTimeout(look, 60);
}

const nodeLabel = (nodeId: string) => {
  const at = locate(currentPage(getState()), nodeId);
  if (at?.kind !== "node") return "Block";
  return at.node.name ?? getComponent(at.node.type)?.label?.split(":")[0] ?? at.node.type;
};

/** A click on the canvas while commenting: start a comment on what's under it. */
function startFromClick(doc: Document, e: MouseEvent) {
  const blockEl = (e.target as Element | null)?.closest?.("[data-node-id]");
  if (!blockEl) return;
  const nodeId = blockEl.getAttribute("data-node-id")!;
  const { pageId, bp } = getState();
  const at = locate(currentPage(getState()), nodeId);
  const node = at?.kind === "node" ? at.node : null;
  const slot = node ? pieceAtPoint(node, blockEl, e.clientX, e.clientY) : null;
  const anchor = (slot?.box && blockEl.querySelector(slot.box)) || blockEl;
  const r = anchor.getBoundingClientRect();
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const label = [nodeLabel(nodeId), slot?.label].filter(Boolean).join(" › ").slice(0, 120);
  startDraft({ pageId, nodeId, ...(slot ? { path: slot.path } : {}), bp, fx: clamp((e.clientX - r.left) / (r.width || 1)), fy: clamp((e.clientY - r.top) / (r.height || 1)), label });
}

type Spot = { id: string; x: number; y: number };

export function CommentLayer() {
  const threads = useComments((s) => s.threads);
  const open = useComments((s) => s.open);
  const draft = useComments((s) => s.draft);
  const showResolved = useComments((s) => s.showResolved);
  const seen = useComments((s) => s.seen);
  const pageId = useEditor((s) => s.pageId);
  const bp = useEditor((s) => s.bp);
  const commenting = useCommentMode();
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => {
    startComments();
    setCanvasCommentHandler(startFromClick);
    return () => setCanvasCommentHandler(null);
  }, []);

  const shown = useMemo(() => threads.filter((t) => t.pageId === pageId && t.bp === bp && (t.status === "open" || showResolved || t.id === open)), [threads, pageId, bp, showResolved, open]);

  // Follow the blocks: measure each pin's spot on every frame while any pin (or a draft) is shown.
  useEffect(() => {
    const targets = [...shown.map((t) => ({ ...t })), ...(draft && draft.pageId === pageId && draft.bp === bp ? [{ ...draft, id: "draft" }] : [])];
    if (!targets.length) return void setSpots([]);
    let raf = 0;
    let last = "";
    const tick = () => {
      const doc = frameDoc();
      const next: Spot[] = [];
      if (doc) {
        for (const t of targets) {
          const el = anchorEl(doc, t);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) continue;
          const p = toScreen(bp, r.left + t.fx * r.width, r.top + t.fy * r.height);
          next.push({ id: t.id, x: Math.round(p.x), y: Math.round(p.y) });
        }
      }
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setSpots(next);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [shown, draft, pageId, bp]);

  // Esc closes the open thread (and leaves comment mode).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (getComments().open || getComments().draft) {
        openThread(null);
        startDraft(null);
      } else if (isCommentMode()) setCommentMode(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const spot = (id: string) => spots.find((s) => s.id === id);
  const openThreadObj = open ? threads.find((t) => t.id === open) : null;
  const me = getAuthor()?.name;

  return (
    <div className={`ed-cmt-layer${commenting ? " is-commenting" : ""}`} aria-label="Comments on the canvas">
      {commenting ? (
        <div className="ed-cmt-hint" role="status">
          Click anything on the {BREAKPOINT_LABEL[bp]} frame to comment on it · Esc to stop
        </div>
      ) : null}
      {shown.map((t, i) => {
        const s = spot(t.id);
        if (!s) return null;
        const unread = isUnread(t, seen, me);
        const first = t.messages[0]!;
        const kind = t.status === "resolved" ? "is-resolved" : unread ? "is-new" : "is-read";
        return (
          <button
            key={t.id}
            type="button"
            className={`ed-cmt-pin ${kind}${open === t.id ? " is-open" : ""}`}
            style={{ left: s.x, top: s.y, ...(kind === "is-read" ? { ["--pin" as string]: first.by.color } : {}) }}
            aria-label={`Comment by ${first.by.name}${unread ? ", new" : ""}${t.status === "resolved" ? ", resolved" : ""}: ${first.text.slice(0, 60)}`}
            title={`${first.by.name}: ${first.text.slice(0, 80)}`}
            onClick={() => openThread(open === t.id ? null : t.id)}
          >
            {t.status === "resolved" ? "✓" : initials(first.by.name) || i + 1}
          </button>
        );
      })}
      {openThreadObj && spot(openThreadObj.id) ? <ThreadCard thread={openThreadObj} at={spot(openThreadObj.id)!} /> : null}
      {draft && spot("draft") ? (
        <>
          <span className="ed-cmt-pin is-draft" style={{ left: spot("draft")!.x, top: spot("draft")!.y }} aria-hidden="true">
            +
          </span>
          <NewComment at={spot("draft")!} />
        </>
      ) : null}
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Where a card sits beside its pin, kept on the board. */
function useCardPlace(at: Spot) {
  const ref = useRef<HTMLElement>(null);
  const [pos, setPos] = useState({ left: at.x + 26, top: at.y - 18 });
  useLayoutEffect(() => {
    const { size } = getBoard();
    const w = ref.current?.offsetWidth ?? 320;
    const h = ref.current?.offsetHeight ?? 200;
    let left = at.x + 26;
    if (left + w > size.w - 12) left = at.x - 26 - w;
    const top = Math.max(12, Math.min(at.y - 18, size.h - h - 12));
    setPos({ left: Math.max(12, left), top });
  }, [at.x, at.y]);
  return { ref, pos };
}

function AuthorGate({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  return (
    <form
      className="ed-cmt-gate"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setAuthor(name);
        onDone();
      }}
    >
      <label htmlFor="ed-cmt-name">Your name, shown on your comments</label>
      <div className="ed-cmt-row">
        <input id="ed-cmt-name" className="ed-input" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Alex" />
        <button type="submit" className="ed-btn ed-btn-accent ed-btn-sm" disabled={!name.trim()}>
          Save
        </button>
      </div>
    </form>
  );
}

/** Enter sends, Shift+Enter makes a new line. */
function Composer({ placeholder, onSend, autoFocus }: { placeholder: string; onSend: (text: string) => Promise<boolean>; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<string[]>([]);
  useEffect(() => void teamPeople().then(setPeople), []);
  const q = mentionQuery(text);
  const matches = q === null ? [] : people.filter((p) => p.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    if (await onSend(text.trim())) setText("");
    setBusy(false);
  };
  const key = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // With suggestions open, Enter picks the first teammate.
      if (matches.length) setText(completeMention(text, matches[0]!));
      else void submit();
    }
  };
  return (
    <div className="ed-cmt-compose">
      {matches.length ? (
        <ul className="ed-mentions" role="listbox" aria-label="Mention a teammate">
          {matches.map((m) => (
            <li key={m}>
              <button type="button" role="option" aria-selected={false} onMouseDown={(e) => (e.preventDefault(), setText(completeMention(text, m)))}>
                @{m.split("@")[0] === "claude" ? "Claude" : m.split("@")[0]} <small>{m === "claude" ? "Claude works on it through the connector" : m}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea className="ed-input" rows={2} value={text} placeholder={placeholder} autoFocus={autoFocus} aria-label={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={key} />
      <button type="button" className="ed-btn ed-btn-accent ed-btn-sm" disabled={!text.trim() || busy} onClick={() => void submit()} aria-label="Send">
        {busy ? "…" : "Send"}
      </button>
    </div>
  );
}

function NewComment({ at }: { at: Spot }) {
  const draft = useComments((s) => s.draft)!;
  const error = useComments((s) => s.error);
  const [author, setA] = useState(getAuthor());
  const { ref, pos } = useCardPlace(at);
  return (
    <section ref={ref} className="ed-cmt-card" style={pos} role="dialog" aria-label="New comment">
      <header className="ed-cmt-head">
        <span className="ed-cmt-anchor">{draft.label}</span>
        <span className="ed-cmt-scope">{BREAKPOINT_LABEL[draft.bp]}</span>
        <button type="button" className="ed-mini" aria-label="Cancel" onClick={() => startDraft(null)}>
          ×
        </button>
      </header>
      {author ? (
        <Composer
          autoFocus
          placeholder="Add a comment… (@name to mention)"
          onSend={async (text) => {
            const id = newId("t");
            const okd = await send({ op: "create", id, ...draft, by: author, text });
            if (okd) {
              setCommentMode(false);
              openThread(id);
            }
            return okd;
          }}
        />
      ) : (
        <AuthorGate onDone={() => setA(getAuthor())} />
      )}
      {error ? <p className="ed-sheet-error">{error}</p> : null}
    </section>
  );
}

const when = (at: number) => {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** @mentions in blue. */
const Text = ({ text }: { text: string }) => (
  <p className="ed-cmt-text">
    {text.split(/(@[\w.-]{1,40})/g).map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="ed-cmt-mention">
          {part}
        </span>
      ) : (
        part
      ),
    )}
  </p>
);

function ThreadCard({ thread, at }: { thread: CommentThread; at: Spot }) {
  const error = useComments((s) => s.error);
  const [author, setA] = useState(getAuthor());
  const { ref, pos } = useCardPlace(at);
  // messages and edit events, in time order
  const items = [...thread.messages.map((m) => ({ kind: "msg" as const, at: m.at, m })), ...thread.events.map((ev) => ({ kind: "ev" as const, at: ev.at, ev }))].sort((a, b) => a.at - b.at);
  return (
    <section ref={ref} className="ed-cmt-card" style={pos} role="dialog" aria-label={`Comment thread on ${thread.label}`}>
      <header className="ed-cmt-head">
        <span className="ed-cmt-anchor">{thread.label}</span>
        <span className="ed-cmt-scope">{BREAKPOINT_LABEL[thread.bp]}</span>
        {thread.status === "open" ? (
          <button type="button" className="ed-btn ed-btn-sm ed-cmt-resolve" disabled={!author} onClick={() => author && void send({ op: "resolve", id: thread.id, by: author }).then((ok) => ok && openThread(null))}>
            ✓ Resolve
          </button>
        ) : (
          <button type="button" className="ed-btn ed-btn-sm" onClick={() => void send({ op: "reopen", id: thread.id })}>
            Reopen
          </button>
        )}
        <button
          type="button"
          className="ed-mini"
          aria-label="Delete this comment"
          title="Delete this comment"
          onClick={() => {
            if (confirm("Delete this comment and its replies?")) void send({ op: "delete", id: thread.id }).then(() => openThread(null));
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
          </svg>
        </button>
        <button type="button" className="ed-mini" aria-label="Close" onClick={() => openThread(null)}>
          ×
        </button>
      </header>
      <ol className="ed-cmt-list">
        {items.map((it) =>
          it.kind === "msg" ? (
            <li key={it.m.id} className="ed-cmt-msg">
              <span className="ed-cmt-av" style={{ background: it.m.by.color }} aria-hidden="true">
                {initials(it.m.by.name)}
              </span>
              <div>
                <div className="ed-cmt-meta">
                  <b>{it.m.by.name}</b> · {when(it.m.at)}
                </div>
                <Text text={it.m.text} />
              </div>
            </li>
          ) : (
            <li key={it.ev.id} className="ed-cmt-event">
              <span aria-hidden="true">→</span>
              <span>
                {it.ev.by} · {it.ev.text}
                {it.ev.count > 1 ? ` ×${it.ev.count}` : ""} · {when(it.ev.at)}
              </span>
            </li>
          ),
        )}
        {thread.status === "resolved" ? (
          <li className="ed-cmt-event is-resolved">
            <span aria-hidden="true">✓</span>
            <span>
              Resolved by {thread.resolvedBy ?? "someone"} · {thread.resolvedAt ? when(thread.resolvedAt) : ""}
            </span>
          </li>
        ) : null}
      </ol>
      {author ? (
        <Composer placeholder="Reply… (@name to mention)" onSend={(text) => send({ op: "reply", id: thread.id, msgId: newId("m"), by: author, text })} />
      ) : (
        <AuthorGate onDone={() => setA(getAuthor())} />
      )}
      {error ? <p className="ed-sheet-error">{error}</p> : null}
    </section>
  );
}

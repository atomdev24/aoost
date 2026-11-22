import { z } from "zod";

/**
 * Comments on the canvas (site and CMS review, 22 Nov 2026, phase 2).
 *
 * A thread is pinned to a block (and, for a project piece or fixture, to that item), at a spot
 * given as fractions of its box, on the screen size it was made on. It moves with the block when
 * the layout changes, unlike a pin at fixed coordinates. While a thread is open, edits to its block
 * show up in it as one-line events, so the comment and the fix sit together.
 *
 * There are no accounts yet: each person picks a name and colour, kept in their browser. The
 * server adds the login it saw (`who`) so a name can be traced if it matters.
 */

export const COMMENT_BREAKPOINTS = ["mobile", "tablet", "desktop", "widescreen"] as const;
const Id = z.string().regex(/^[\w-]{4,40}$/);

export const CommentAuthor = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type CommentAuthor = z.infer<typeof CommentAuthor>;

export const CommentMessage = z.object({
  id: Id,
  by: CommentAuthor,
  text: z.string().trim().min(1).max(2000),
  at: z.number().int().positive(),
  who: z.string().max(120).optional(),
});
export type CommentMessage = z.infer<typeof CommentMessage>;

/** "Alex changed Size on Mobile" — kept short; repeated edits within a few minutes fold into one. */
export const CommentEvent = z.object({
  id: Id,
  text: z.string().max(200),
  by: z.string().max(120),
  at: z.number().int().positive(),
  count: z.number().int().min(1).default(1),
});
export type CommentEvent = z.infer<typeof CommentEvent>;

export const CommentThread = z.object({
  id: Id,
  pageId: z.string().min(1).max(80),
  nodeId: z.string().min(1).max(80),
  /** The item inside the block it's about (["projects", 3]), if any. */
  path: z.array(z.union([z.string().max(40), z.number().int().min(0)])).max(6).optional(),
  bp: z.enum(COMMENT_BREAKPOINTS),
  /** Where the pin sits, as fractions of what it's attached to. */
  fx: z.number().min(0).max(1),
  fy: z.number().min(0).max(1),
  /** What it's about, for the list ("Projects › storefront.png"). */
  label: z.string().max(120),
  status: z.enum(["open", "resolved"]),
  at: z.number().int().positive(),
  messages: z.array(CommentMessage).min(1).max(200),
  events: z.array(CommentEvent).max(50).default([]),
  resolvedBy: z.string().max(40).optional(),
  resolvedAt: z.number().int().positive().optional(),
});
export type CommentThread = z.infer<typeof CommentThread>;

export const MAX_THREADS = 300;
/** Edits closer together than this fold into one event. */
export const EVENT_FOLD_MS = 5 * 60 * 1000;

/** What the editor sends. The server stamps time, ids and the login. */
export const CommentOp = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("create"),
    id: Id,
    pageId: z.string().min(1).max(80),
    nodeId: z.string().min(1).max(80),
    path: CommentThread.shape.path,
    bp: z.enum(COMMENT_BREAKPOINTS),
    fx: z.number().min(0).max(1),
    fy: z.number().min(0).max(1),
    label: z.string().max(120),
    by: CommentAuthor,
    text: z.string().trim().min(1).max(2000),
  }),
  z.object({ op: z.literal("reply"), id: Id, msgId: Id, by: CommentAuthor, text: z.string().trim().min(1).max(2000) }),
  z.object({ op: z.literal("resolve"), id: Id, by: CommentAuthor }),
  z.object({ op: z.literal("reopen"), id: Id }),
  z.object({ op: z.literal("delete"), id: Id }),
  z.object({ op: z.literal("move"), id: Id, fx: z.number().min(0).max(1), fy: z.number().min(0).max(1) }),
]);
export type CommentOp = z.infer<typeof CommentOp>;

/** Keep the list under the cap: the oldest resolved threads go first, then the oldest of all. */
function capped(threads: CommentThread[], max = MAX_THREADS): CommentThread[] {
  if (threads.length <= max) return threads;
  const drop = new Set<string>();
  const resolved = threads.filter((t) => t.status === "resolved").sort((a, b) => a.at - b.at);
  for (const t of resolved) {
    if (threads.length - drop.size <= max) break;
    drop.add(t.id);
  }
  const rest = threads.filter((t) => !drop.has(t.id));
  return rest.length > max ? rest.slice(rest.length - max) : rest;
}

/** Apply one change. Returns the new list, or an error a person can read. */
export function applyCommentOp(threads: CommentThread[], op: CommentOp, now: number, who: string): { ok: true; threads: CommentThread[] } | { ok: false; error: string } {
  const find = (id: string) => threads.find((t) => t.id === id);
  const edit = (id: string, fn: (t: CommentThread) => CommentThread) => threads.map((t) => (t.id === id ? fn(t) : t));
  switch (op.op) {
    case "create": {
      if (find(op.id)) return { ok: false, error: "That comment already exists." };
      const thread: CommentThread = {
        id: op.id,
        pageId: op.pageId,
        nodeId: op.nodeId,
        ...(op.path?.length ? { path: op.path } : {}),
        bp: op.bp,
        fx: op.fx,
        fy: op.fy,
        label: op.label,
        status: "open",
        at: now,
        messages: [{ id: op.id, by: op.by, text: op.text, at: now, who }],
        events: [],
      };
      return { ok: true, threads: capped([...threads, thread]) };
    }
    case "reply": {
      const t = find(op.id);
      if (!t) return { ok: false, error: "That comment was deleted." };
      if (t.messages.length >= 200) return { ok: false, error: "This thread is full. Start a new comment." };
      if (t.messages.some((m) => m.id === op.msgId)) return { ok: true, threads };
      // A reply to a resolved thread opens it again.
      return { ok: true, threads: edit(op.id, (x) => ({ ...x, status: "open", resolvedBy: undefined, resolvedAt: undefined, messages: [...x.messages, { id: op.msgId, by: op.by, text: op.text, at: now, who }] })) };
    }
    case "resolve":
      if (!find(op.id)) return { ok: false, error: "That comment was deleted." };
      return { ok: true, threads: edit(op.id, (x) => ({ ...x, status: "resolved", resolvedBy: op.by.name, resolvedAt: now })) };
    case "reopen":
      if (!find(op.id)) return { ok: false, error: "That comment was deleted." };
      return { ok: true, threads: edit(op.id, (x) => ({ ...x, status: "open", resolvedBy: undefined, resolvedAt: undefined })) };
    case "delete":
      return { ok: true, threads: threads.filter((t) => t.id !== op.id) };
    case "move":
      if (!find(op.id)) return { ok: false, error: "That comment was deleted." };
      return { ok: true, threads: edit(op.id, (x) => ({ ...x, fx: op.fx, fy: op.fy })) };
  }
}

/**
 * Edits to blocks with open threads: one event line per thread ("Alex · Move piece"), folded
 * with the last one when it's the same person and summary within a few minutes.
 * Returns null when no thread is touched (nothing to save).
 */
export function noteEdits(threads: CommentThread[], changedNodeIds: string[] | undefined, summary: string | undefined, by: string, now: number, newId: () => string): CommentThread[] | null {
  if (!changedNodeIds?.length) return null;
  const changed = new Set(changedNodeIds);
  let touched = false;
  const text = (summary || "Edited").slice(0, 200);
  const next = threads.map((t) => {
    if (t.status !== "open" || !changed.has(t.nodeId)) return t;
    touched = true;
    const last = t.events.at(-1);
    if (last && last.by === by && last.text === text && now - last.at < EVENT_FOLD_MS) {
      return { ...t, events: [...t.events.slice(0, -1), { ...last, at: now, count: last.count + 1 }] };
    }
    const events = [...t.events, { id: newId(), text, by, at: now, count: 1 }];
    return { ...t, events: events.length > 50 ? events.slice(events.length - 50) : events };
  });
  return touched ? next : null;
}

/** Threads read back from storage: anything that no longer fits the shape is dropped. */
export function cleanThreads(input: unknown): CommentThread[] {
  if (!Array.isArray(input)) return [];
  const out: CommentThread[] = [];
  for (const raw of input) {
    const r = CommentThread.safeParse(raw);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** The last time anything happened in a thread (a message, an edit, resolving it). */
export const lastActivity = (t: CommentThread) => Math.max(t.at, t.messages.at(-1)?.at ?? 0, t.events.at(-1)?.at ?? 0, t.resolvedAt ?? 0);

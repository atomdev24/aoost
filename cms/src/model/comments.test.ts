import { describe, expect, it } from "vitest";
import { applyCommentOp, cleanThreads, CommentOp, EVENT_FOLD_MS, lastActivity, MAX_THREADS, noteEdits, type CommentThread } from "./comments";

const alex = { name: "Alex", color: "#3b82f6" };
const maya = { name: "Maya", color: "#e14b8a" };
const create = (id: string, extra: Partial<Extract<CommentOp, { op: "create" }>> = {}) =>
  CommentOp.parse({ op: "create", id, pageId: "home", nodeId: "projects-1", path: ["projects", 3], bp: "mobile", fx: 0.5, fy: 0.25, label: "Projects › storefront.png", by: maya, text: "Can this move up on phones?", ...extra });
const ok = (r: ReturnType<typeof applyCommentOp>) => {
  if (!r.ok) throw new Error(r.error);
  return r.threads;
};

describe("comments", () => {
  it("starts a thread pinned to a block's item, then replies, resolves and reopens", () => {
    let t = ok(applyCommentOp([], create("t-0001"), 1000, "editor"));
    expect(t[0]).toMatchObject({ id: "t-0001", nodeId: "projects-1", path: ["projects", 3], bp: "mobile", status: "open", label: "Projects › storefront.png" });
    expect(t[0]!.messages).toEqual([{ id: "t-0001", by: maya, text: "Can this move up on phones?", at: 1000, who: "editor" }]);
    t = ok(applyCommentOp(t, { op: "reply", id: "t-0001", msgId: "m-0002", by: alex, text: "Made it smaller there." }, 2000, "editor"));
    expect(t[0]!.messages.map((m) => m.by.name)).toEqual(["Maya", "Alex"]);
    // the same reply sent twice (a retry) is kept once
    expect(ok(applyCommentOp(t, { op: "reply", id: "t-0001", msgId: "m-0002", by: alex, text: "Made it smaller there." }, 2100, "editor"))[0]!.messages).toHaveLength(2);
    t = ok(applyCommentOp(t, { op: "resolve", id: "t-0001", by: alex }, 3000, "editor"));
    expect(t[0]).toMatchObject({ status: "resolved", resolvedBy: "Alex", resolvedAt: 3000 });
    expect(lastActivity(t[0]!)).toBe(3000);
    // replying to a resolved thread opens it again
    t = ok(applyCommentOp(t, { op: "reply", id: "t-0001", msgId: "m-0003", by: maya, text: "Still covers the note." }, 4000, "editor"));
    expect(t[0]!.status).toBe("open");
    expect(t[0]!.resolvedBy).toBeUndefined();
    t = ok(applyCommentOp(t, { op: "move", id: "t-0001", fx: 0.1, fy: 0.9 }, 5000, "editor"));
    expect(t[0]).toMatchObject({ fx: 0.1, fy: 0.9 });
    expect(ok(applyCommentOp(t, { op: "delete", id: "t-0001" }, 6000, "editor"))).toEqual([]);
  });

  it("refuses what doesn't fit", () => {
    expect(CommentOp.safeParse({ ...create("t-0001"), text: "   " }).success).toBe(false);
    expect(CommentOp.safeParse({ ...create("t-0001"), fx: 2 }).success).toBe(false);
    expect(CommentOp.safeParse({ ...create("t-0001"), by: { name: "A", color: "red" } }).success).toBe(false);
    const t = ok(applyCommentOp([], create("t-0001"), 1000, "editor"));
    expect(applyCommentOp(t, create("t-0001"), 1000, "editor")).toEqual({ ok: false, error: "That comment already exists." });
    expect(applyCommentOp(t, { op: "reply", id: "t-9999", msgId: "m-0001", by: alex, text: "hi" }, 1, "x")).toEqual({ ok: false, error: "That comment was deleted." });
  });

  it("shows edits to the block inside its open threads, folding repeats", () => {
    let n = 0;
    const id = () => `e-${String(++n).padStart(4, "0")}`;
    let t = ok(applyCommentOp([], create("t-0001"), 1000, "editor"));
    t = ok(applyCommentOp(t, create("t-0002", { nodeId: "journals-1", path: undefined }), 1000, "editor"));
    expect(noteEdits(t, ["hero-1"], "Edit hero", "Alex", 2000, id)).toBeNull(); // no thread on that block
    t = noteEdits(t, ["projects-1"], "Move piece", "Alex", 2000, id)!;
    t = noteEdits(t, ["projects-1"], "Move piece", "Alex", 2000 + 1000, id)!;
    expect(t[0]!.events).toEqual([{ id: "e-0001", text: "Move piece", by: "Alex", at: 3000, count: 2 }]);
    t = noteEdits(t, ["projects-1"], "Move piece", "Alex", 3000 + EVENT_FOLD_MS + 1, id)!;
    expect(t[0]!.events).toHaveLength(2);
    expect(t[1]!.events).toEqual([]); // the other block's thread is untouched
    // resolved threads don't collect edits
    t = ok(applyCommentOp(t, { op: "resolve", id: "t-0001", by: alex }, 9e6, "editor"));
    expect(noteEdits(t, ["projects-1"], "Resize piece", "Alex", 9e6 + 1, id)).toBeNull();
  });

  it("keeps under the cap by dropping the oldest resolved threads first", () => {
    let t: CommentThread[] = [];
    for (let i = 0; i < MAX_THREADS; i++) t = ok(applyCommentOp(t, create(`t-${String(i).padStart(4, "0")}`), 1000 + i, "e"));
    t = ok(applyCommentOp(t, { op: "resolve", id: "t-0005", by: alex }, 9000, "e"));
    t = ok(applyCommentOp(t, create("t-new1"), 10000, "e"));
    expect(t).toHaveLength(MAX_THREADS);
    expect(t.some((x) => x.id === "t-0005")).toBe(false);
    expect(t.at(-1)!.id).toBe("t-new1");
  });

  it("drops stored threads that no longer fit the shape", () => {
    const good = ok(applyCommentOp([], create("t-0001"), 1000, "editor"))[0]!;
    expect(cleanThreads([good, { id: "x" }, null])).toEqual([good]);
    expect(cleanThreads("nope")).toEqual([]);
  });
});

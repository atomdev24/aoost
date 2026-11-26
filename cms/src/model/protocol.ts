import type { Breakpoint } from "../schema";
import type { CommentThread } from "./comments";
import type { Op } from "./ops";

/** What the open editor is looking at; lets Claude resolve "make this rounder". */
export type EditorContext = {
  pageId: string | null;
  selectedNodeIds: string[];
  breakpoint: Breakpoint;
  updatedAt: number;
  /** Something Alex asked Claude to do, typed in the editor's palette ("Ask Claude to do this"). */
  request?: { text: string; at: number } | null;
};

/** Draft store → editor. */
export type ServerMessage =
  | { type: "hello"; version: number; clientId: string }
  | { type: "ops"; ops: Op[]; version: number; origin: string; summary?: string; changedNodeIds?: string[] }
  | { type: "screenshot-request"; requestId: string; pageId: string; breakpoint: Breakpoint }
  | { type: "published"; version: number }
  /** A newer deploy was merged into the draft (the changes themselves arrive as "ops"). */
  | { type: "synced"; at: number; conflicts: number }
  /** A newer deploy couldn't be merged into the draft; the editor offers a way out. */
  | { type: "sync-blocked"; reason: string }
  /** Something was sent to staging (or staging was emptied: null). */
  | { type: "staging"; meta: StagingMeta | null }
  /** The comments changed (a new one, a reply, resolved, or an edit noted in a thread). */
  | { type: "comments"; threads: CommentThread[] }
  /** Someone else in the editor moved, selected, or left (p: null). */
  | { type: "presence"; clientId: string; p: Presence | null }
  /** Everyone else already in the editor, sent when you first say who you are. */
  | { type: "presences"; list: { clientId: string; p: Presence }[] }
  /** Something happened (an edit, a comment, a publish): the activity feed's newest line. */
  | { type: "activity"; entry: ActivityEntry }
  /** What Claude is doing (shown as a working pill and a glow on the blocks it touches). */
  | ({ type: "agent"; at: number } & AgentStatus);

export type AgentStatus = {
  /** working: busy (thinking or editing); done: finished, with what it did. */
  state: "working" | "done";
  /** Plain words: "Reading the Home page", "Updating the hero heading". */
  text: string;
  pageId?: string;
  nodeIds?: string[];
};

/** Who is in the editor and what they're looking at (no accounts: the name and colour they comment under). */
export type Presence = {
  name: string;
  color: string;
  pageId: string | null;
  bp: Breakpoint;
  /** Selected block ids (their soft lock). */
  sel: string[];
  /** Their pointer, in the frame's own pixels for their screen size; null when it's off the canvas. */
  cur: { x: number; y: number } | null;
};

/** One line of the activity feed. */
export type ActivityEntry = { id: string; at: number; by: string; kind: "edit" | "comment" | "publish"; text: string; pageId?: string; count?: number };

/** What is in staging: the share link's token, when and by whom it was staged, and the live base it was built on. */
export type StagingMeta = { token: string; at: number; label: string; by: string; baseFp: string };

/** A value both the draft and the live site changed differently since the draft's base. The draft kept its own. */
export type SyncConflict = { id: string; label: string; draft: string; live: string };
/** How the draft stands against the live site. */
export type SyncInfo = { at: number | null; conflicts: SyncConflict[]; blocked: string | null };

/** Editor → draft store. */
export type ClientMessage =
  | { type: "context"; context: Omit<EditorContext, "updatedAt"> }
  | { type: "screenshot"; requestId: string; png: string }
  | { type: "presence"; p: Presence }
  | { type: "ping" };

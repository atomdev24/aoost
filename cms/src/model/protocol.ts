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
  | { type: "comments"; threads: CommentThread[] };

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
  | { type: "ping" };

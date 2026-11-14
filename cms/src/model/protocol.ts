import type { Breakpoint } from "../schema";
import type { Op } from "./ops";

/** What the open editor is looking at; lets Claude resolve "make this rounder". */
export type EditorContext = {
  pageId: string | null;
  selectedNodeIds: string[];
  breakpoint: Breakpoint;
  updatedAt: number;
};

/** Draft store → editor. */
export type ServerMessage =
  | { type: "hello"; version: number; clientId: string }
  | { type: "ops"; ops: Op[]; version: number; origin: string; summary?: string; changedNodeIds?: string[] }
  | { type: "screenshot-request"; requestId: string; pageId: string; breakpoint: Breakpoint }
  | { type: "published"; version: number };

/** Editor → draft store. */
export type ClientMessage =
  | { type: "context"; context: Omit<EditorContext, "updatedAt"> }
  | { type: "screenshot"; requestId: string; png: string }
  | { type: "ping" };

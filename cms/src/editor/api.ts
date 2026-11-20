import type { Op } from "../model/ops";
import type { SyncInfo } from "../model/protocol";
import type { Issue, Site } from "../schema";
import type { RefItem } from "../model/refs";
import { noteProblem } from "./problems";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public issues?: Issue[],
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  } catch (e) {
    noteProblem("request", `${init?.method ?? "GET"} ${path.split("?")[0]} didn't reach the server`, e instanceof Error ? e.message : undefined);
    throw e;
  }
  if (res.status === 401) {
    location.href = "/admin/login";
    throw new ApiError("Signed out.", 401);
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; issues?: Issue[] } & T;
  if (!res.ok || data.ok === false) noteProblem("request", `${init?.method ?? "GET"} ${path.split("?")[0]} failed (${res.status}): ${data.error ?? "no message"}`, data.issues ? JSON.stringify(data.issues).slice(0, 2000) : undefined);
  if (!res.ok || data.ok === false) throw new ApiError(data.error ?? `Request failed (${res.status}).`, res.status, data.issues);
  return data;
}

export type DraftState = { version: number; dirty: boolean; editors: number; sync?: SyncInfo };

export const api = {
  site: () => call<{ site: Site; version: number }>("/api/editor/site"),
  state: () => call<DraftState>("/api/editor/state"),
  ops: (ops: Op[], clientId: string, summary?: string) => call<{ version: number }>("/api/editor/ops", { method: "POST", body: JSON.stringify({ ops, clientId, summary }) }),
  reset: () => call<{ version: number }>("/api/editor/reset", { method: "POST" }),
  publish: (message?: string) => call<{ commit: string | null; url: string | null; changed: string[] }>("/api/editor/publish", { method: "POST", body: JSON.stringify({ message }) }),
  resolveConflict: (id: string, choice: "live" | "mine") => call<{ version: number }>("/api/editor/conflict", { method: "POST", body: JSON.stringify({ id, choice }) }),
  keepDraft: () => call("/api/editor/sync/keep", { method: "POST" }),
  claude: () => call<{ connected: boolean; seenAt: number | null }>("/api/editor/claude"),
  logout: () => call("/api/logout", { method: "POST" }),
  refs: (page: string) => call<{ items: RefItem[] }>(`/api/editor/refs?page=${encodeURIComponent(page)}`),
  putRefs: (page: string, items: RefItem[]) => call<{ items: RefItem[] }>("/api/editor/refs", { method: "PUT", body: JSON.stringify({ page, items }) }),
};

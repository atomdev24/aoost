import type { Op } from "../model/ops";
import type { SyncInfo } from "../model/protocol";
import type { Issue, Site } from "../schema";

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
  const res = await fetch(path, { credentials: "same-origin", ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  if (res.status === 401) {
    location.href = "/admin/login";
    throw new ApiError("Signed out.", 401);
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; issues?: Issue[] } & T;
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
};

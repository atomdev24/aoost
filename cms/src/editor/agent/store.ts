import { useSyncExternalStore } from "react";

/** What Claude is doing, as the open editor sees it (from the connector, over the live socket). */
export type AgentView = { state: "idle" | "working" | "done"; text: string; pageId?: string; nodeIds: string[]; at: number };

const IDLE: AgentView = { state: "idle", text: "", nodeIds: [], at: 0 };
/** Quiet for this long while "working" means Claude has finished its turn. */
export const QUIET_MS = 12_000;
/** How long "finished" stays up. */
export const DONE_MS = 6_000;

let view: AgentView = IDLE;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const set = (v: AgentView) => ((view = v), listeners.forEach((l) => l()));

/** The next state after a message from the connector (pure, for tests). */
export function nextView(prev: AgentView, msg: { state: "working" | "done"; text: string; pageId?: string; nodeIds?: string[] }, now: number): AgentView {
  // Keep the glow on what Claude touched until it names other blocks.
  const nodeIds = msg.nodeIds?.length ? msg.nodeIds : prev.state === "working" ? prev.nodeIds : [];
  return { state: msg.state, text: msg.text, pageId: msg.pageId ?? (prev.state === "working" ? prev.pageId : undefined), nodeIds, at: now };
}

export function agentSaid(msg: { state: "working" | "done"; text: string; pageId?: string; nodeIds?: string[] }) {
  clearTimeout(timer);
  set(nextView(view, msg, Date.now()));
  timer = setTimeout(
    () => {
      if (view.state === "working") agentSaid({ state: "done", text: "Finished" });
      else set(IDLE);
    },
    view.state === "working" ? QUIET_MS : DONE_MS,
  );
}

export const getAgent = () => view;
export function useAgent(): AgentView {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => view,
    () => IDLE,
  );
}

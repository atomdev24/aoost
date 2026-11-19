import type { ClientMessage, ServerMessage } from "../model/protocol";
import { api } from "./api";
import { applyRemote, getState, hasUnsavedChanges, replaceSite, setClientId, setLive, setUnpublished, subscribe } from "./store";

/**
 * Live sync with the draft store (SPEC §8). Changes made elsewhere (Claude
 * through /mcp, or another tab) arrive as ops and are applied on top of the
 * open editor within about a second. The editor in turn reports what Alex is
 * looking at, so Claude can resolve "make this rounder" to the selected node.
 */
let socket: WebSocket | null = null;
let retry = 0;
let lastVersion = -1;
let contextTimer: ReturnType<typeof setTimeout> | undefined;
let lastContext = "";
const handlers = new Set<(msg: ServerMessage) => void>();

/** Other modules (the screenshot responder) can listen for server messages. */
export const onServerMessage = (fn: (msg: ServerMessage) => void) => {
  handlers.add(fn);
  return () => {
    handlers.delete(fn);
  };
};

export const send = (msg: ClientMessage) => {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
};

function sendContext(force = false) {
  const s = getState();
  const context = { pageId: s.pageId, selectedNodeIds: s.overlayId ? [s.overlayId] : s.selection, breakpoint: s.bp };
  const key = JSON.stringify(context);
  if (!force && key === lastContext) return;
  lastContext = key;
  send({ type: "context", context });
}

async function resync() {
  // We missed something while disconnected: take the server's draft, unless there is local work to save first.
  if (hasUnsavedChanges()) return;
  const [{ site, version }, state] = await Promise.all([api.site(), api.state()]);
  lastVersion = version;
  replaceSite(site, state.dirty);
}

function handle(msg: ServerMessage) {
  switch (msg.type) {
    case "hello":
      setClientId(msg.clientId);
      setLive(true);
      if (lastVersion >= 0 && msg.version !== lastVersion) void resync();
      lastVersion = msg.version;
      sendContext(true);
      break;
    case "ops": {
      lastVersion = msg.version;
      if (msg.origin === getState().clientId) break;
      if (msg.origin === "sync") {
        applyRemote(msg.ops, msg.summary ?? "Updated from the live site", msg.changedNodeIds);
        break;
      }
      const who = msg.origin === "mcp" ? "Claude" : "Another window";
      applyRemote(msg.ops, `${who}: ${msg.summary ?? "edit"}`, msg.changedNodeIds);
      break;
    }
    case "published":
      setUnpublished(false);
      break;
  }
  handlers.forEach((fn) => fn(msg));
}

export function connect() {
  if (socket && socket.readyState <= WebSocket.OPEN) return;
  socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/editor/socket`);
  socket.onopen = () => {
    retry = 0;
  };
  socket.onmessage = (e) => {
    try {
      handle(JSON.parse(e.data as string) as ServerMessage);
    } catch {
      // ignore anything that isn't ours
    }
  };
  socket.onclose = () => {
    setLive(false);
    socket = null;
    setTimeout(connect, Math.min(15000, 500 * 2 ** retry++));
  };
  socket.onerror = () => socket?.close();
}

/** Start live sync: connect, keep the connection alive, and publish selection changes. */
export function startSync() {
  connect();
  subscribe(() => {
    clearTimeout(contextTimer);
    contextTimer = setTimeout(sendContext, 150);
  });
  setInterval(() => send({ type: "ping" }), 30000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && connect());
}

/** The draft version after one of our own saves, so a later reconnect doesn't treat it as missed. */
export const noteVersion = (version: number) => {
  lastVersion = Math.max(lastVersion, version);
};

import { useSyncExternalStore } from "react";
import type { Presence } from "../../model/protocol";
import { getAuthor } from "../comments/store";
import { onServerMessage, send } from "../socket";
import { getState, subscribe } from "../store";

/**
 * Who else is in the editor (phase 3 of the review, without accounts): each open editor says who it
 * is (the name and colour you comment under), which page and screen size it's on, what it has
 * selected, and where its pointer is on the canvas. Loads after the board.
 */
export type Other = Presence & { clientId: string; seen: number };

let others = new Map<string, Other>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let snapshot: Other[] = [];
const refresh = () => {
  snapshot = [...others.values()].sort((a, b) => a.name.localeCompare(b.name));
  emit();
};
export const useOthers = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
export const getOthers = () => snapshot;

/** The colour a guest gets from their name (comments/store keeps the chosen one). */
const GUEST = ["#3B82F6", "#E14B8A", "#22A06B", "#F59E0B", "#8B5CF6", "#14B8A6"];
export const me = (): { name: string; color: string } => {
  const a = getAuthor();
  if (a) return a;
  let id = "";
  try {
    id = sessionStorage.getItem("ed-guest") ?? "";
    if (!id) sessionStorage.setItem("ed-guest", (id = String(Math.floor(Math.random() * 90 + 10))));
  } catch {
    id = "1";
  }
  return { name: `Guest ${id}`, color: GUEST[Number(id) % GUEST.length]! };
};

let cur: { x: number; y: number } | null = null;
let last = "";
let timer: ReturnType<typeof setTimeout> | undefined;
function post(force = false) {
  const s = getState();
  const who = me();
  const p: Presence = { name: who.name, color: who.color, pageId: s.pageId, bp: s.bp, sel: s.selection, cur };
  const key = JSON.stringify(p);
  if (!force && key === last) return;
  last = key;
  send({ type: "presence", p });
}
/** Pointer moves are sent at most ten times a second. */
const soon = () => {
  if (timer) return;
  timer = setTimeout(() => {
    timer = undefined;
    post();
  }, 100);
};

/** The pointer over the editable frame, in that frame's own pixels. */
let frameDoc: Document | null = null;
const move = (e: PointerEvent) => {
  cur = { x: e.clientX, y: e.clientY };
  soon();
};
const leave = () => {
  cur = null;
  soon();
};
function watchFrame() {
  const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument ?? null;
  if (doc === frameDoc) return;
  frameDoc?.removeEventListener("pointermove", move);
  frameDoc?.removeEventListener("pointerleave", leave);
  frameDoc = doc;
  doc?.addEventListener("pointermove", move, { passive: true });
  doc?.addEventListener("pointerleave", leave);
}

let started = false;
export function startPresence() {
  if (started) return;
  started = true;
  onServerMessage((msg) => {
    if (msg.type === "hello") {
      // a new connection: everyone has forgotten us
      others = new Map();
      refresh();
      post(true);
    } else if (msg.type === "presences") {
      others = new Map(msg.list.map((x) => [x.clientId, { ...x.p, clientId: x.clientId, seen: Date.now() }]));
      refresh();
    } else if (msg.type === "presence") {
      if (msg.p) others.set(msg.clientId, { ...msg.p, clientId: msg.clientId, seen: Date.now() });
      else others.delete(msg.clientId);
      refresh();
    }
  });
  subscribe(soon);
  setInterval(watchFrame, 1000);
  watchFrame();
  // say hello now, and again now and then so a quiet editor isn't forgotten
  post(true);
  setInterval(() => post(true), 25_000);
  // an editor that hasn't been heard from in a minute has probably gone (its tab slept)
  setInterval(() => {
    const now = Date.now();
    let gone = false;
    for (const [id, o] of others) if (now - o.seen > 60_000) (others.delete(id), (gone = true));
    if (gone) refresh();
  }, 15_000);
}
export const resendPresence = () => post(true);

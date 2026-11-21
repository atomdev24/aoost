import { useEffect, useState } from "react";
import type { Breakpoint } from "../../schema";
import { megaItemId } from "../store";

/**
 * The last look of each page, per breakpoint: a small JPEG kept in this
 * browser (IndexedDB), shown in the frames while the editor loads a
 * page. Saved from the board's still pictures (stills.ts).
 */
export type Snapshot = { url: string; width: number; height: number; at: number };
type Stored = { blob: Blob; width: number; height: number; at: number };

const DB = "aoost-editor";
const STORE = "snapshots";
const SCALE_WIDTH = 960;
const MIN_GAP_MS = 20_000;

function db(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const d = await db();
  if (!d) return null;
  return new Promise((resolve) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

const key = (pageId: string, bp: Breakpoint) => `${pageId}:${bp}`;

export async function readSnapshot(pageId: string, bp: Breakpoint): Promise<Snapshot | null> {
  const s = await tx<Stored | undefined>("readonly", (st) => st.get(key(pageId, bp)));
  return s ? { url: URL.createObjectURL(s.blob), width: s.width, height: s.height, at: s.at } : null;
}

const last = new Map<string, number>();

/**
 * Keep a small copy of a frame's still picture (stills.ts) as the page's loading picture: shown
 * while the page loads next time. Throttled per page and breakpoint.
 */
export async function saveSnapshot(pageId: string, bp: Breakpoint, picture: HTMLCanvasElement) {
  if (megaItemId(pageId)) return;
  const k = key(pageId, bp);
  if (Date.now() - (last.get(k) ?? 0) < MIN_GAP_MS) return;
  last.set(k, Date.now());
  const scale = Math.min(1, SCALE_WIDTH / picture.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(picture.width * scale);
  canvas.height = Math.round(picture.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(picture, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
  // Width and height in design pixels, so the frame can take the snapshot's height.
  if (blob) await tx("readwrite", (st) => st.put({ blob, width: picture.width, height: picture.height, at: Date.now() } satisfies Stored, k));
}

/** The stored snapshot of a page at one breakpoint (null while loading or when there is none). */
export function useSnapshot(pageId: string, bp: Breakpoint): Snapshot | null | undefined {
  const [snap, setSnap] = useState<Snapshot | null | undefined>(undefined);
  useEffect(() => {
    let url: string | null = null;
    let live = true;
    setSnap(undefined);
    void readSnapshot(pageId, bp).then((s) => {
      if (!live) return s && URL.revokeObjectURL(s.url);
      url = s?.url ?? null;
      setSnap(s);
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [pageId, bp]);
  return snap;
}

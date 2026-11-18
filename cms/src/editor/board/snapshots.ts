import { useEffect, useState } from "react";
import type { Breakpoint } from "../../schema";
import { DESIGN_WIDTH } from "../../schema";
import { capturePreview } from "../screenshot";
import { currentPage, getState, megaItemId, subscribe } from "../store";

/**
 * The last look of each page, per breakpoint: a small JPEG kept in this
 * browser (IndexedDB), shown greyed in the frames while the editor loads a
 * page. A fresh one is taken in idle time after saves.
 */
export type Snapshot = { url: string; width: number; height: number; at: number };
type Stored = { blob: Blob; width: number; height: number; at: number };

const DB = "aoost-editor";
const STORE = "snapshots";
const SCALE_WIDTH = 480;
const MIN_GAP_MS = 20_000;
const IDLE_MS = 3_000;

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

/** Downscale a full-size PNG (base64) to a small JPEG. */
async function shrink(png: string): Promise<Stored | null> {
  const img = new Image();
  img.src = `data:image/png;base64,${png}`;
  await img.decode().catch(() => null);
  if (!img.naturalWidth) return null;
  const scale = Math.min(1, SCALE_WIDTH / img.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.72));
  // Width and height in design pixels, so the frame can take the snapshot's height.
  return blob ? { blob, width: img.naturalWidth, height: img.naturalHeight, at: Date.now() } : null;
}

const last = new Map<string, number>();
let busy = false;

/** Take a snapshot of a page at every breakpoint (skipped for menu panels and when one was taken recently). */
export async function takeSnapshots(pageId: string, slug: string) {
  if (busy || megaItemId(pageId)) return;
  busy = true;
  try {
    for (const bp of Object.keys(DESIGN_WIDTH) as Breakpoint[]) {
      const k = key(pageId, bp);
      if (Date.now() - (last.get(k) ?? 0) < MIN_GAP_MS) continue;
      last.set(k, Date.now());
      const png = await capturePreview(slug, bp).catch(() => null);
      const stored = png ? await shrink(png) : null;
      if (stored) await tx("readwrite", (st) => st.put(stored, k));
    }
  } finally {
    busy = false;
  }
}

/** After saves settle, refresh the open page's snapshots in idle time. */
export function watchSnapshots(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let prev = getState().save;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const page = currentPage(getState());
      const run = () => void takeSnapshots(page.id, page.slug);
      if ("requestIdleCallback" in window) (window as unknown as { requestIdleCallback: (fn: () => void, o?: { timeout: number }) => void }).requestIdleCallback(run, { timeout: 5000 });
      else run();
    }, IDLE_MS);
  };
  const unsub = subscribe(() => {
    const s = getState().save;
    if (s === "saved" && prev !== "saved") schedule();
    prev = s;
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
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

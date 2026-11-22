import { useSyncExternalStore } from "react";

/**
 * Every upload in flight, wherever it started (the media library, a media field, a drop on the
 * page, the board's references). The upload tray reads this to show a progress bar with time
 * left and a Cancel button, then says "Uploaded" or "Upload cancelled" for a moment after.
 */
export type UploadStatus = "preparing" | "uploading" | "done" | "cancelled" | "failed";
export type Upload = {
  id: string;
  name: string;
  /** Bytes being sent (the file plus any resized copies), once known. */
  total: number;
  loaded: number;
  status: UploadStatus;
  error?: string;
  /** When sending started (ms), for the time-left estimate. */
  sendingSince?: number;
};

/** How long a finished upload stays in the tray. */
export const LINGER_MS = { done: 3500, cancelled: 4000 } as const;

let uploads: Upload[] = [];
const cancels = new Map<string, () => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getUploads = () => uploads;
export function useUploads(): Upload[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => uploads,
  );
}

let seq = 0;
/** Add an upload to the tray. `cancel` stops it; the caller then rejects with UploadCancelled. */
export function startUpload(name: string, size: number, cancel: () => void): string {
  const id = `up-${Date.now().toString(36)}-${++seq}`;
  uploads = [...uploads, { id, name, total: size, loaded: 0, status: "preparing" }];
  cancels.set(id, cancel);
  emit();
  return id;
}

export function updateUpload(id: string, patch: Partial<Upload>) {
  let changed = false;
  uploads = uploads.map((u) => (u.id === id ? ((changed = true), { ...u, ...patch }) : u));
  if (!changed) return;
  const u = uploads.find((x) => x.id === id)!;
  if (u.status === "done" || u.status === "cancelled") {
    cancels.delete(id);
    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(() => dismissUpload(id), LINGER_MS[u.status]));
  }
  if (u.status === "failed") cancels.delete(id);
  emit();
}

/** Stop an upload that is still going. It shows "Upload cancelled" for a few seconds. */
export function cancelUpload(id: string) {
  const u = uploads.find((x) => x.id === id);
  if (!u || (u.status !== "preparing" && u.status !== "uploading")) return;
  cancels.get(id)?.();
  updateUpload(id, { status: "cancelled" });
}

export function dismissUpload(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  cancels.delete(id);
  uploads = uploads.filter((u) => u.id !== id);
  emit();
}

/** Rejected by uploadFile when its upload was cancelled: callers drop it quietly (the tray already said so). */
export class UploadCancelled extends Error {
  constructor(name: string) {
    super(`Upload of ${name} cancelled.`);
    this.name = "UploadCancelled";
  }
}
export const isCancelled = (e: unknown): e is UploadCancelled => e instanceof UploadCancelled;

/** Reset between tests. */
export function _resetUploads() {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  cancels.clear();
  uploads = [];
  emit();
}

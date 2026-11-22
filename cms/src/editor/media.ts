
export { isCancelled } from "./uploads";

export type MediaItem = { key: string; url: string; name: string; kind: string; size: number; uploaded: string; width?: number; height?: number; variants: number[] };

/** The Worker's limit (worker/media.ts MAX_UPLOAD), checked before sending too. */
export const MAX_UPLOAD = 95 * 1024 * 1024;

/**
 * Upload one file, with progress and a Cancel button in the upload tray (media-upload.ts, loaded
 * on first use). A cancelled upload rejects with UploadCancelled (see isCancelled).
 */
export async function uploadFile(file: File): Promise<MediaItem> {
  // Load the module first, then upload outside the import: a cancelled or failed upload must not
  // look like a failed download of the editor's code (the load guard reloads the page for those).
  const m = await import("./media-upload");
  return m.uploadFile(file);
}

export async function listMedia(): Promise<MediaItem[]> {
  const res = await fetch("/api/editor/media", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Could not load the media library (${res.status}).`);
  return ((await res.json()) as { items: MediaItem[] }).items;
}

export async function deleteMedia(key: string): Promise<void> {
  const res = await fetch(`/api/editor/media?key=${encodeURIComponent(key)}`, { method: "DELETE", credentials: "same-origin" });
  if (!res.ok) throw new Error(`Could not delete (${res.status}).`);
}

export const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

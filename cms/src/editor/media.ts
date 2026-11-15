import { IMAGE_WIDTHS } from "../render/media";

export type MediaItem = { key: string; url: string; name: string; kind: string; size: number; uploaded: string; width?: number; height?: number; variants: number[] };

const RASTER = /\.(jpe?g|png|webp|avif)$/i;

/** Resize in the browser to a WebP blob. Returns null if the browser can't. */
async function toWebp(bitmap: ImageBitmap, width: number): Promise<Blob | null> {
  const height = Math.round((bitmap.height / bitmap.width) * width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  return blob && blob.type === "image/webp" ? blob : null;
}

/**
 * Upload one file. Raster images are measured and resized to WebP variants
 * here, in the browser, so the Worker can serve the right size per screen
 * without any paid image service.
 */
export async function uploadFile(file: File): Promise<MediaItem> {
  const form = new FormData();
  form.set("file", file, file.name);
  if (RASTER.test(file.name)) {
    try {
      const bitmap = await createImageBitmap(file);
      form.set("width", String(bitmap.width));
      form.set("height", String(bitmap.height));
      for (const w of IMAGE_WIDTHS) {
        // Only make variants smaller than the original (never upscale).
        if (w >= bitmap.width) continue;
        const blob = await toWebp(bitmap, w);
        if (blob) form.set(`v${w}`, blob, `${w}.webp`);
      }
      bitmap.close();
    } catch {
      // Unreadable image: upload it as it is.
    }
  }
  const res = await fetch("/api/editor/media", { method: "POST", body: form, credentials: "same-origin" });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; item?: MediaItem };
  if (!res.ok || !data.item) throw new Error(data.error ?? `Upload failed (${res.status}).`);
  return data.item;
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

import { IMAGE_WIDTHS } from "../render/media";
import { MAX_UPLOAD, type MediaItem } from "./media";
import { startUpload, updateUpload, UploadCancelled } from "./uploads";

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
 * without any paid image service. Each upload shows in the upload tray with
 * its progress and a Cancel button; a cancelled upload rejects with
 * UploadCancelled (see isCancelled), which callers let pass quietly.
 */
export async function uploadFile(file: File): Promise<MediaItem> {
  let xhr: XMLHttpRequest | null = null;
  let cancelled = false;
  const id = startUpload(file.name, file.size, () => {
    cancelled = true;
    xhr?.abort();
  });
  const fail = (message: string) => {
    updateUpload(id, { status: "failed", error: message });
    return new Error(message);
  };
  if (file.size > MAX_UPLOAD) throw fail(`${file.name} is over 95 MB. Use a YouTube or Vimeo link for long video.`);
  const form = new FormData();
  form.set("file", file, file.name);
  if (RASTER.test(file.name)) {
    try {
      const bitmap = await createImageBitmap(file);
      form.set("width", String(bitmap.width));
      form.set("height", String(bitmap.height));
      for (const w of IMAGE_WIDTHS) {
        if (cancelled) break;
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
  if (cancelled) throw new UploadCancelled(file.name);
  return new Promise<MediaItem>((resolve, reject) => {
    const req = (xhr = new XMLHttpRequest());
    req.open("POST", "/api/editor/media");
    req.withCredentials = true;
    req.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      updateUpload(id, { status: "uploading", loaded: e.loaded, total: e.total });
    };
    req.upload.onloadstart = () => updateUpload(id, { status: "uploading", loaded: 0, sendingSince: Date.now() });
    req.onabort = () => reject(new UploadCancelled(file.name));
    req.onerror = () => reject(fail(`${file.name} didn't upload: the connection dropped.`));
    req.onload = () => {
      let data: { ok?: boolean; error?: string; item?: MediaItem } = {};
      try {
        data = JSON.parse(req.responseText);
      } catch {
        /* not JSON */
      }
      if (req.status < 200 || req.status >= 300 || !data.item) return reject(fail(data.error ?? `${file.name} didn't upload (${req.status}).`));
      updateUpload(id, { status: "done", loaded: 1, total: 1 });
      resolve(data.item);
    };
    req.send(form);
  });
}


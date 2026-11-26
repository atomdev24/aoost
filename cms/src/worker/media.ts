import { IMAGE_WIDTHS } from "../render/media";
import type { Env } from "./env";
import { error, json } from "./http";

/**
 * Media lives in R2 (SPEC §7), never in the repo.
 *
 *   <year>/<name>-<id>.<ext>          the original upload
 *   _v/<key>/<width>.webp             resized WebP variants of raster images
 *
 * Delivery: /media/<key>?w=960 answers with the smallest stored variant at
 * least that wide (when the browser accepts WebP), else the original.
 */
export const MEDIA_TYPES: Record<string, { mime: string; kind: "image" | "video" | "audio" | "file" | "font" | "model" | "lottie" }> = {
  jpg: { mime: "image/jpeg", kind: "image" },
  jpeg: { mime: "image/jpeg", kind: "image" },
  png: { mime: "image/png", kind: "image" },
  webp: { mime: "image/webp", kind: "image" },
  avif: { mime: "image/avif", kind: "image" },
  gif: { mime: "image/gif", kind: "image" },
  svg: { mime: "image/svg+xml", kind: "image" },
  mp4: { mime: "video/mp4", kind: "video" },
  webm: { mime: "video/webm", kind: "video" },
  mp3: { mime: "audio/mpeg", kind: "audio" },
  m4a: { mime: "audio/mp4", kind: "audio" },
  wav: { mime: "audio/wav", kind: "audio" },
  ogg: { mime: "audio/ogg", kind: "audio" },
  pdf: { mime: "application/pdf", kind: "file" },
  zip: { mime: "application/zip", kind: "file" },
  woff2: { mime: "font/woff2", kind: "font" },
  woff: { mime: "font/woff", kind: "font" },
  ttf: { mime: "font/ttf", kind: "font" },
  otf: { mime: "font/otf", kind: "font" },
  glb: { mime: "model/gltf-binary", kind: "model" },
  json: { mime: "application/json", kind: "lottie" },
};
export const MAX_UPLOAD = 95 * 1024 * 1024; // Workers accept request bodies up to 100 MB on the free plan

const VARIANT = "_v/";
const KEY = /^[0-9]{4}\/[a-z0-9][a-z0-9-]*\.[a-z0-9]+$/;

export type MediaItem = { key: string; url: string; name: string; kind: string; size: number; uploaded: string; width?: number; height?: number; variants: number[] };

export const extOf = (name: string) => (/\.([a-z0-9]+)$/i.exec(name)?.[1] ?? "").toLowerCase();

/** A storage key from a file name: 2026/desert-sun-k3x9a2.jpg */
export function mediaKey(name: string, now = new Date(), rand = crypto.getRandomValues(new Uint8Array(4))): string {
  const ext = extOf(name);
  const base =
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "file";
  const id = [...rand].map((b) => (b % 36).toString(36)).join("");
  return `${now.getUTCFullYear()}/${base}-${id}.${ext}`;
}

/** Which stored variant to serve for a requested width. */
export function pickVariant(requested: number, variants: number[]): number | null {
  const fit = variants.filter((w) => w >= requested).sort((a, b) => a - b)[0];
  return fit ?? null;
}

export const toItem = (o: R2Object): MediaItem => ({
  key: o.key,
  url: `/media/${o.key}`,
  name: o.customMetadata?.name ?? o.key.split("/").pop()!,
  kind: MEDIA_TYPES[extOf(o.key)]?.kind ?? "file",
  size: o.size,
  uploaded: o.uploaded.toISOString(),
  width: o.customMetadata?.width ? Number(o.customMetadata.width) : undefined,
  height: o.customMetadata?.height ? Number(o.customMetadata.height) : undefined,
  variants: (o.customMetadata?.variants ?? "").split(",").filter(Boolean).map(Number),
});

/** Store a file (and optional pre-made WebP variants) in R2. Shared by the editor upload and the MCP tool. */
export async function storeMedia(
  env: Env,
  file: { name: string; body: ArrayBuffer | ReadableStream; size?: number },
  extra: { width?: number; height?: number; variants?: Map<number, ArrayBuffer> } = {},
): Promise<MediaItem> {
  const type = MEDIA_TYPES[extOf(file.name)];
  if (!type) throw Object.assign(new Error(`.${extOf(file.name) || "?"} files can't be uploaded. Allowed: ${Object.keys(MEDIA_TYPES).join(", ")}.`), { status: 415 });
  if (file.size !== undefined && file.size > MAX_UPLOAD) throw Object.assign(new Error("That file is over 95 MB. Use a YouTube or Vimeo link for long video."), { status: 413 });
  const key = mediaKey(file.name);
  const widths = [...(extra.variants?.keys() ?? [])].filter((w) => (IMAGE_WIDTHS as readonly number[]).includes(w)).sort((a, b) => a - b);
  for (const w of widths) {
    await env.MEDIA.put(`${VARIANT}${key}/${w}.webp`, extra.variants!.get(w)!, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
  }
  const stored = await env.MEDIA.put(key, file.body, {
    httpMetadata: { contentType: type.mime, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: {
      name: file.name.slice(0, 200),
      ...(extra.width ? { width: String(Math.round(extra.width)) } : {}),
      ...(extra.height ? { height: String(Math.round(extra.height)) } : {}),
      ...(widths.length ? { variants: widths.join(",") } : {}),
    },
  });
  return toItem(stored!);
}

/** /api/editor/media: list, upload, delete. Already authenticated. */
export async function mediaApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === "GET") {
    const listed = await env.MEDIA.list({ limit: 500, cursor: url.searchParams.get("cursor") ?? undefined, include: ["customMetadata", "httpMetadata"] });
    const items = listed.objects.filter((o) => !o.key.startsWith(VARIANT)).map(toItem);
    items.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
    return json({ ok: true, items, cursor: listed.truncated ? listed.cursor : null });
  }
  if (request.method === "POST") {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return error(400, "Expected a file upload.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) return error(400, "No file in the upload.");
    const variants = new Map<number, ArrayBuffer>();
    for (const [name, value] of form) {
      const m = /^v(\d+)$/.exec(name);
      if (m && value instanceof File) variants.set(Number(m[1]), await value.arrayBuffer());
    }
    try {
      const item = await storeMedia(env, { name: file.name, body: await file.arrayBuffer(), size: file.size }, { width: Number(form.get("width")) || undefined, height: Number(form.get("height")) || undefined, variants });
      return json({ ok: true, item });
    } catch (e) {
      return error((e as { status?: number }).status ?? 500, e instanceof Error ? e.message : "Upload failed.");
    }
  }
  if (request.method === "DELETE") {
    const key = url.searchParams.get("key") ?? "";
    if (!KEY.test(key)) return error(400, "Not a media key.");
    const variants = await env.MEDIA.list({ prefix: `${VARIANT}${key}/` });
    await env.MEDIA.delete([key, ...variants.objects.map((o) => o.key)]);
    return json({ ok: true });
  }
  return error(405, "Method not allowed.");
}

/** Public delivery: GET /media/<key>[?w=960] */
export async function serveMedia(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const key = decodeURIComponent(url.pathname.slice("/media/".length));
  if (!KEY.test(key)) return new Response("Not found", { status: 404 });

  const wanted = Number(url.searchParams.get("w"));
  const acceptsWebp = (request.headers.get("Accept") ?? "").includes("image/webp");
  if (wanted > 0 && acceptsWebp) {
    const head = await env.MEDIA.head(key);
    const width = pickVariant(wanted, (head?.customMetadata?.variants ?? "").split(",").filter(Boolean).map(Number));
    if (width) {
      const variant = await env.MEDIA.get(`${VARIANT}${key}/${width}.webp`);
      if (variant) return respond(variant, "image/webp", key);
    }
  }

  const range = request.headers.get("Range");
  const object = await env.MEDIA.get(key, range ? { range: request.headers } : undefined);
  if (!object) return new Response("Not found", { status: 404 });
  return respond(object, MEDIA_TYPES[extOf(key)]?.mime ?? "application/octet-stream", key, range ? object : undefined);
}

function respond(object: R2ObjectBody, type: string, key: string, ranged?: R2ObjectBody): Response {
  const headers = new Headers({
    "Content-Type": type,
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: object.httpEtag,
    "Accept-Ranges": "bytes",
    Vary: "Accept",
    "X-Content-Type-Options": "nosniff",
  });
  // An uploaded SVG or JSON must never run script when opened on its own.
  if (type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  if (["pdf", "zip"].includes(extOf(key))) headers.set("Content-Disposition", `${extOf(key) === "zip" ? "attachment" : "inline"}; filename="${key.split("/").pop()}"`);
  if (ranged?.range && "offset" in ranged.range) {
    const { offset = 0, length = ranged.size - offset } = ranged.range as { offset?: number; length?: number };
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${ranged.size}`);
    headers.set("Content-Length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { headers });
}

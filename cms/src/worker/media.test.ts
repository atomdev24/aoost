import { describe, expect, it } from "vitest";
import type { Env } from "./env";
import { extOf, mediaApi, mediaKey, pickVariant, serveMedia, storeMedia } from "./media";

/** A minimal in-memory stand-in for an R2 bucket. */
function fakeBucket() {
  const store = new Map<string, { body: Uint8Array; httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string, string>; uploaded: Date }>();
  const object = (key: string) => {
    const o = store.get(key)!;
    return { key, size: o.body.length, uploaded: o.uploaded, httpEtag: `"${key}"`, customMetadata: o.customMetadata, httpMetadata: o.httpMetadata, body: new Blob([o.body as BlobPart]).stream(), range: undefined };
  };
  const bucket = {
    async put(key: string, body: ArrayBuffer | ReadableStream, opts: { httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string, string> } = {}) {
      const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : new Uint8Array(await new Response(body).arrayBuffer());
      store.set(key, { body: bytes, ...opts, uploaded: new Date() });
      return object(key);
    },
    async get(key: string) {
      return store.has(key) ? object(key) : null;
    },
    async head(key: string) {
      return store.has(key) ? object(key) : null;
    },
    async list({ prefix = "" }: { prefix?: string } = {}) {
      return { objects: [...store.keys()].filter((k) => k.startsWith(prefix)).map(object), truncated: false };
    },
    async delete(keys: string | string[]) {
      for (const k of [keys].flat()) store.delete(k);
    },
  };
  return { store, env: { MEDIA: bucket } as unknown as Env };
}
const bytes = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;
const get = (env: Env, path: string, headers: Record<string, string> = {}) => serveMedia(new Request(`https://x.dev${path}`, { headers }), env, new URL(`https://x.dev${path}`));

describe("media keys", () => {
  it("builds tidy, unique keys under the year", () => {
    const key = mediaKey("Desert Sün (final).JPG", new Date("2026-11-15"), new Uint8Array([1, 2, 3, 4]));
    expect(key).toBe("2026/desert-sun-final-1234.jpg");
    expect(extOf("a.b.WebP")).toBe("webp");
  });
  it("picks the smallest variant that is wide enough", () => {
    expect(pickVariant(960, [480, 960, 1600])).toBe(960);
    expect(pickVariant(700, [480, 960, 1600])).toBe(960);
    expect(pickVariant(2400, [480, 960])).toBeNull();
    expect(pickVariant(480, [])).toBeNull();
  });
});

describe("upload and delivery", () => {
  it("stores the original with its size and variants, and lists it", async () => {
    const { env, store } = fakeBucket();
    const item = await storeMedia(env, { name: "hero.jpg", body: bytes("original") }, { width: 1500, height: 1000, variants: new Map([[480, bytes("small")], [960, bytes("medium")], [123, bytes("odd")]]) });
    expect(item).toMatchObject({ kind: "image", width: 1500, height: 1000, variants: [480, 960] });
    expect(item.url).toMatch(/^\/media\/\d{4}\/hero-[a-z0-9]{4}\.jpg$/);
    expect([...store.keys()].sort()).toEqual([`_v/${item.key}/480.webp`, `_v/${item.key}/960.webp`, item.key].sort());
    const list = (await (await mediaApi(new Request("https://x.dev/api/editor/media"), env, new URL("https://x.dev/api/editor/media"))).json()) as { items: { key: string }[] };
    expect(list.items.map((i) => i.key)).toEqual([item.key]); // variants are not listed
  });
  it("serves a WebP variant when asked for a width and the browser accepts WebP", async () => {
    const { env } = fakeBucket();
    const item = await storeMedia(env, { name: "hero.jpg", body: bytes("original") }, { variants: new Map([[480, bytes("small")], [960, bytes("medium")]]) });
    const small = await get(env, `${item.url}?w=480`, { Accept: "image/avif,image/webp,*/*" });
    expect(small.headers.get("Content-Type")).toBe("image/webp");
    expect(await small.text()).toBe("small");
    expect(small.headers.get("Cache-Control")).toContain("immutable");
    expect(await (await get(env, `${item.url}?w=700`, { Accept: "image/webp" })).text()).toBe("medium");
    // wider than any variant, or no WebP support: the original
    expect(await (await get(env, `${item.url}?w=2400`, { Accept: "image/webp" })).text()).toBe("original");
    const plain = await get(env, `${item.url}?w=480`, { Accept: "image/png" });
    expect([plain.headers.get("Content-Type"), await plain.text()]).toEqual(["image/jpeg", "original"]);
  });
  it("rejects unknown types and bad keys", async () => {
    const { env } = fakeBucket();
    await expect(storeMedia(env, { name: "virus.exe", body: bytes("x") })).rejects.toThrow(/can't be uploaded/);
    await expect(storeMedia(env, { name: "big.mp4", body: bytes("x"), size: 200 * 1024 * 1024 })).rejects.toThrow(/95 MB/);
    expect((await get(env, "/media/../secret")).status).toBe(404);
    expect((await get(env, "/media/_v/2026/a.jpg/480.webp")).status).toBe(404);
    expect((await get(env, "/media/2026/missing.jpg")).status).toBe(404);
  });
  it("locks down SVG so it can't run script", async () => {
    const { env } = fakeBucket();
    const item = await storeMedia(env, { name: "art.svg", body: bytes("<svg/>") });
    const res = await get(env, item.url);
    expect(res.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
  it("deletes the original and its variants", async () => {
    const { env, store } = fakeBucket();
    const item = await storeMedia(env, { name: "hero.jpg", body: bytes("o") }, { variants: new Map([[480, bytes("s")]]) });
    const url = new URL(`https://x.dev/api/editor/media?key=${item.key}`);
    expect((await mediaApi(new Request(url, { method: "DELETE" }), env, url)).status).toBe(200);
    expect(store.size).toBe(0);
  });
});

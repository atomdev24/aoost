import { cacheable, cacheRule } from "./sw-rules";

/*
 * The editor's service worker: lets the home-screen app open offline.
 * The shell (the page itself) always comes from the network first, so a
 * refresh after a deploy loads the new build; the cached copy is only used
 * when the network is down. Build files are cached for good
 * (their names change with each build) in one cache that outlives a deploy,
 * so a tab that is still running the old build can finish loading its parts.
 * Nothing else is touched: API, draft and publish requests always go
 * straight to the network. __BUILD__ is replaced at build time.
 */
type FetchEvt = Event & { request: Request; respondWith(r: Promise<Response>): void; waitUntil(p: Promise<unknown>): void };
type Scope = {
  addEventListener(type: string, fn: (e: FetchEvt) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  location: Location;
};
const sw = globalThis as unknown as Scope;
declare const __BUILD__: string;
const CACHE = `aoost-editor-${__BUILD__}`;
/** Build files from this and earlier deploys; trimmed to the newest MAX_ASSETS. */
const ASSETS = "aoost-editor-assets";
const MAX_ASSETS = 400;

const SHELL = "/admin/";

sw.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([SHELL, "/admin/manifest.webmanifest", "/admin/app-icon-192.png"]))
      .catch(() => undefined)
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("aoost-editor-") && k !== CACHE && k !== ASSETS).map((k) => caches.delete(k))))
      .then(trimAssets)
      .then(() => sw.clients.claim()),
  );
});

async function trimAssets(): Promise<void> {
  const c = await caches.open(ASSETS);
  const keys = await c.keys();
  // keys() lists in insertion order, so the oldest go first.
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((k) => c.delete(k)));
}

async function fromNetwork(req: Request, key: Request | string, cache = CACHE): Promise<Response> {
  const res = await fetch(req);
  if (cacheable(res)) {
    const copy = res.clone();
    void caches.open(cache).then((c) => c.put(key, copy));
  }
  return res;
}

/**
 * Network first; the cached copy only when the network fails (offline). A slow network still
 * waits for the live page: falling back on slowness could open an older build of the editor.
 */
async function networkFirst(req: Request, key: Request | string): Promise<Response> {
  try {
    return await fromNetwork(req, key);
  } catch (err) {
    const hit = await caches.match(key);
    if (hit) return hit;
    throw err;
  }
}

sw.addEventListener("fetch", (e) => {
  const req = e.request;
  const rule = cacheRule(req.url, req.method, sw.location.origin, req.mode === "navigate");
  if (!rule) return;
  if (rule === "asset") {
    e.respondWith(caches.match(req).then((hit) => hit ?? fromNetwork(req, req, ASSETS)));
    return;
  }
  e.respondWith(networkFirst(req, rule === "shell" ? SHELL : req));
});

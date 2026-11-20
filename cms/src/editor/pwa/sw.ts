import { cacheable, cacheRule } from "./sw-rules";

/*
 * The editor's service worker: lets the home-screen app open offline.
 * The shell (the page itself) always comes from the network first, so a
 * refresh after a deploy loads the new build; the cached copy is only used
 * when the network is down or very slow. Build files are cached for good
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
/** How long the shell may take from the network before the cached copy is used. */
const SHELL_WAIT_MS = 4000;
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

/** Network first; the cached copy only if the network fails or takes longer than SHELL_WAIT_MS. */
function networkFirst(req: Request, key: Request | string): Promise<Response> {
  const fresh = fromNetwork(req, key);
  return new Promise<Response>((resolve, reject) => {
    let done = false;
    const fallback = () =>
      caches.match(key).then((hit) => {
        if (done) return;
        if (hit) {
          done = true;
          resolve(hit);
        }
      });
    const timer = setTimeout(() => void fallback(), SHELL_WAIT_MS);
    fresh.then(
      (res) => {
        clearTimeout(timer);
        if (!done) {
          done = true;
          resolve(res);
        }
      },
      () => {
        clearTimeout(timer);
        void fallback().then(() => {
          if (!done) reject(new Error("offline and nothing cached"));
        });
      },
    );
  });
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

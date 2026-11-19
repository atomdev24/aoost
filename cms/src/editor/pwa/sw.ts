import { cacheable, cacheRule } from "./sw-rules";

/*
 * The editor's service worker: a fast start from the home screen. The shell
 * opens from the cache and refreshes in the background; build files are
 * cached for good (their names change with each build). Nothing else is
 * touched: API, draft and publish requests always go straight to the network.
 * __BUILD__ is replaced at build time, so each deploy installs a fresh worker
 * and drops the old caches.
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
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("aoost-editor-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

async function fromNetwork(req: Request, key: Request | string): Promise<Response> {
  const res = await fetch(req);
  if (cacheable(res)) {
    const copy = res.clone();
    void caches.open(CACHE).then((c) => c.put(key, copy));
  }
  return res;
}

sw.addEventListener("fetch", (e) => {
  const req = e.request;
  const rule = cacheRule(req.url, req.method, sw.location.origin, req.mode === "navigate");
  if (!rule) return;
  if (rule === "asset") {
    e.respondWith(caches.match(req).then((hit) => hit ?? fromNetwork(req, req)));
    return;
  }
  // Shell and icons: answer from the cache at once, refresh it in the background.
  const key = rule === "shell" ? SHELL : req;
  const fresh = fromNetwork(req, key);
  e.waitUntil(fresh.catch(() => undefined));
  e.respondWith(caches.match(key).then((hit) => hit ?? fresh));
});

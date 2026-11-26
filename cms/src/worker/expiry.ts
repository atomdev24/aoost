import type { Env } from "./env";

let cache: { at: number; map: Record<string, string> } | null = null;

/** Slug → unpublish day, from the built site's _expires.json (read at most once a minute per isolate). */
async function expiries(env: Env, request: Request): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < 60_000) return cache.map;
  let map: Record<string, string> = {};
  try {
    const res = await env.ASSETS.fetch(new Request(new URL("/_expires.json", request.url)));
    if (res.ok) map = (await res.json()) as Record<string, string>;
  } catch {
    /* no file: nothing expires */
  }
  cache = { at: Date.now(), map };
  return map;
}

/** "/expo/" and "/expo.html" → "/expo". */
export const pageSlug = (path: string) => (path === "/" || path === "/index.html" ? "/" : path.replace(/\.html$/, "").replace(/\/+$/, "") || "/");

/**
 * Campaign pages past their unpublish day answer 410 Gone with the site's 404 page, so links in
 * old emails land somewhere friendly. Returns null for everything else.
 */
export async function expiredResponse(request: Request, env: Env, today = new Date().toISOString().slice(0, 10)): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = new URL(request.url).pathname;
  if (/\.(?!html$)[a-z0-9]+$/i.test(path)) return null; // files, not pages
  const day = (await expiries(env, request))[pageSlug(path)];
  if (!day || today <= day) return null;
  const notFound = await env.ASSETS.fetch(new Request(new URL("/404.html", request.url)));
  return new Response(notFound.ok ? notFound.body : "This page has ended.", { status: 410, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

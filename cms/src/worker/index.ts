import { authenticate, login, logout } from "./auth";
import { editorApi, preview } from "./api";
import type { Env } from "./env";
import { error, html, json } from "./http";
import { loginPage } from "./login-page";
import { serveMedia } from "./media";

export { DraftStore } from "./draft-store";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      return await route(request, env, url, path);
    } catch (e) {
      console.error(e);
      return path.startsWith("/api/") || path.startsWith("/mcp") ? error(500, e instanceof Error ? e.message : "Something went wrong.") : new Response("Something went wrong.", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env, url: URL, path: string): Promise<Response> {
  // Public API
  if (path === "/api/health") return json({ ok: true, authMode: env.AUTH_MODE });
  if (path === "/api/login" && request.method === "POST") return login(request, env);
  if (path === "/api/logout" && request.method === "POST") return logout(request);
  if (path === "/_published.json") return new Response("Not found", { status: 404 });

  if (path.startsWith("/media/")) return serveMedia(request, env, url);

  const who = await authenticate(request, env);

  if (path === "/api/session") return json({ ok: !!who, authMode: env.AUTH_MODE, passwordSet: env.AUTH_MODE === "access" || !!env.EDITOR_PASSWORD });

  if (path.startsWith("/api/editor/")) {
    if (!who) return error(401, "Sign in to the editor first.");
    return editorApi(request, env, url, who);
  }

  if (path === "/preview" || path.startsWith("/preview/")) {
    if (!who) return Response.redirect(new URL("/admin/login", url).toString(), 302);
    return preview(env, url);
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    if (path === "/admin/login") return who ? Response.redirect(new URL("/admin/", url).toString(), 302) : html(loginPage);
    if (!who) return Response.redirect(new URL("/admin/login", url).toString(), 302);
    // The editor is a single-page app: every /admin route gets its shell.
    const isAsset = /\.[a-z0-9]+$/i.test(path);
    const res = await env.ASSETS.fetch(isAsset ? request : new Request(new URL("/admin/", url), request));
    const headers = new Headers(res.headers);
    headers.set("X-Robots-Tag", "noindex");
    if (!isAsset) headers.set("Cache-Control", "no-store");
    return new Response(res.body, { status: res.status, headers });
  }

  if (path.startsWith("/api/") || path.startsWith("/mcp")) return error(404, "Not built yet.");
  return env.ASSETS.fetch(request);
}

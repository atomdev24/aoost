import { authenticate, login, logout } from "./auth";
import { editorApi, historyPage, preview, staging } from "./api";
import { draftStub, type Env } from "./env";
import { error, html, json } from "./http";
import { loginPage } from "./login-page";
import { mcp } from "./mcp";
import { serveMedia } from "./media";

export { DraftStore } from "./draft-store";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // www.alexoostendurp.com → alexoostendurp.com (keeps the path), so the editor lock and links have one address.
    {
      const u = new URL(request.url);
      if (u.hostname.startsWith("www.")) {
        u.hostname = u.hostname.slice(4);
        return Response.redirect(u.toString(), 301);
      }
    }
    // Public pages and files go straight to the static site (no sign-in work on every visit).
    if (!/^\/(admin|api|mcp|media|preview|staging|_published\.json)(\/|$)/.test(new URL(request.url).pathname)) return env.ASSETS.fetch(request);
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

const PWA_FILES = /^\/admin\/(manifest\.webmanifest|sw\.js|app-icon-\d+\.png)$/;

async function route(request: Request, env: Env, url: URL, path: string): Promise<Response> {
  // Public API
  if (path === "/api/health") return json({ ok: true, authMode: env.AUTH_MODE });
  if (path === "/api/login" && request.method === "POST") return login(request, env);
  if (path === "/api/logout" && request.method === "POST") return logout(request);
  if (path === "/_published.json") return new Response("Not found", { status: 404 });

  if (path.startsWith("/media/")) return serveMedia(request, env, url);
  // A staging share link: public on purpose (like a Framer staging link); the long random token is the key.
  if (path === "/staging" || path.startsWith("/staging/")) return staging(env, url);

  const who = await authenticate(request, env);

  if (path === "/api/session") return json({ ok: !!who, authMode: env.AUTH_MODE, passwordSet: env.AUTH_MODE === "access" || !!env.EDITOR_PASSWORD });

  if (path.startsWith("/api/editor/")) {
    if (!who) return error(401, "Sign in to the editor first.");
    return editorApi(request, env, url, who);
  }

  if (path === "/mcp" || path === "/mcp/") {
    if (!who) return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized. Send the editor password as a bearer token." } }), { status: 401, headers: { "Content-Type": "application/json", "WWW-Authenticate": 'Bearer realm="aoost"' } });
    // Remember that the connector reached us with valid credentials (the editor's "Claude connected" pill).
    if (who.via !== "session") await draftStub(env).noteConnector().catch(() => {});
    return mcp(request, env);
  }


  if (path === "/preview" || path.startsWith("/preview/")) {
    if (!who) return Response.redirect(new URL("/admin/login", url).toString(), 302);
    // A past version (the sign-in that covers /preview covers these too).
    if (path.startsWith("/preview/_version/")) return historyPage(env, url);
    return preview(env, url);
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    if (path === "/admin/login") return who ? Response.redirect(new URL("/admin/", url).toString(), 302) : html(loginPage);
    // The home-screen app's manifest, icons and service worker carry no content, so they load without the editor sign-in.
    if (PWA_FILES.test(path)) return env.ASSETS.fetch(request);
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

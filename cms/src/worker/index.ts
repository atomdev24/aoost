import { oauthIdentity, oauthRoute, resourceMetadataUrl } from "./oauth";
import { expiredResponse } from "./expiry";
import { authenticate, login, logout } from "./auth";
import { editorApi, historyPage, livePage, preview, staging } from "./api";
import { demoEnv, demoStub, draftStub, type Env } from "./env";
import { cleanDemoSettings, DEMO_SETTINGS_KEY, resetsTonight } from "../model/demo-settings";
import { releaseTick } from "./release";
import { error, html, json } from "./http";
import { loginPage } from "./login-page";
import { mcp } from "./mcp";
import { serveMedia } from "./media";

export { DraftStore } from "./draft-store";
export { DemoStore } from "./demo-store";

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
    if (!/^\/(admin|api|mcp|media|preview|staging|demo|_published\.json|_expires\.json|\.well-known|oauth)(\/|$)/.test(new URL(request.url).pathname)) return (await expiredResponse(request, env)) ?? env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      return await route(request, env, url, path);
    } catch (e) {
      console.error(e);
      return path.startsWith("/api/") || path.startsWith("/mcp") ? error(500, e instanceof Error ? e.message : "Something went wrong.") : new Response("Something went wrong.", { status: 500 });
    }
  },
  // At 03:00 in Cape Town the demo editor goes back to its sample site: every night, on Mondays or
  // never, as set from the real editor (Demo editor in the ⋯ menu).
  // Every 15 minutes: releases that are due go live or end (worker/release.ts).
  async scheduled(event: ScheduledController, env: Env): Promise<void> {
    if (event.cron === "0 1 * * *" && resetsTonight(await demoSettings(env), new Date())) await demoStub(env).wipe();
    if (event.cron === "*/15 * * * *") await releaseTick(env, demoEnv(env));
  },
} satisfies ExportedHandler<Env>;

const PWA_FILES = /^\/admin\/(manifest\.webmanifest|sw\.js|app-icon-\d+\.png)$/;

async function route(request: Request, env: Env, url: URL, path: string): Promise<Response> {
  // Public API
  if (path === "/api/health") return json({ ok: true, authMode: env.AUTH_MODE });
  if (path === "/api/login" && request.method === "POST") return login(request, env);
  if (path === "/api/logout" && request.method === "POST") return logout(request);
  if (path === "/_published.json" || path === "/_expires.json") return new Response("Not found", { status: 404 });

  if (path.startsWith("/media/")) return serveMedia(request, env, url);
  // A staging share link: public on purpose (like a Framer staging link); the long random token is the key.
  if (path === "/staging" || path.startsWith("/staging/")) return staging(env, url);

  if (path === "/demo") return Response.redirect(new URL("/demo/", url).toString(), 302);
  if (path.startsWith("/demo/")) return demo(request, env, url, path.slice("/demo".length));

  // Sign-in for the Claude connector from claude.ai (OAuth); see oauth.ts.
  const oauth = await oauthRoute(request, env, url);
  if (oauth) return oauth;

  const who = await authenticate(request, env);

  if (path === "/api/session") return json({ ok: !!who, authMode: env.AUTH_MODE, passwordSet: env.AUTH_MODE === "access" || !!env.EDITOR_PASSWORD });

  if (path.startsWith("/api/editor/")) {
    if (!who) return error(401, "Sign in to the editor first.");
    return editorApi(request, env, url, who);
  }

  if (path === "/mcp" || path === "/mcp/") {
    const agent = who ?? (await oauthIdentity(request, env));
    if (!agent)
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized. Connect through OAuth, or send the editor password as a bearer token." } }), {
        status: 401,
        headers: { "Content-Type": "application/json", "WWW-Authenticate": `Bearer realm="aoost", resource_metadata="${resourceMetadataUrl(url.origin)}"` },
      });
    // Remember that the connector reached us with valid credentials (the editor's "Claude connected" pill).
    if (agent.via !== "session") await draftStub(env).noteConnector().catch(() => {});
    return mcp(request, env);
  }


  if (path === "/preview" || path.startsWith("/preview/")) {
    if (!who) return Response.redirect(new URL("/admin/login", url).toString(), 302);
    // A past version (the sign-in that covers /preview covers these too).
    if (path.startsWith("/preview/_version/")) return historyPage(env, url);
    if (path === "/preview/_live" || path.startsWith("/preview/_live/")) return livePage(env, url);
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

const noindex = (res: Response, store = false) => {
  const headers = new Headers(res.headers);
  headers.set("X-Robots-Tag", "noindex");
  if (store) headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, headers });
};

/**
 * /demo/*: the editor with the wireframe demo site, open to anyone with the link and kept apart
 * from the real draft. It lives outside the paths Cloudflare Access guards (/admin, /api/editor,
 * /preview), so the editor's files are read from /admin here, and its API and previews answer
 * under /demo. Nothing here can publish, reach GitHub, the media library or the connector.
 */
async function demo(request: Request, env: Env, url: URL, rest: string): Promise<Response> {
  const denv = demoEnv(env);
  // Switched off from the real editor: the editor's files still load, everything else says so.
  if (!(await demoSettings(env)).enabled && !rest.startsWith("/assets/")) {
    if (rest.startsWith("/api/")) return error(403, "The demo is switched off.");
    return html("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Demo off</title><body style='margin:0;display:grid;place-items:center;min-height:100vh;background:#161618;color:#ececee;font:16px/1.5 system-ui,sans-serif'><p>This demo is switched off for now.</p>", 503);
  }
  const at = (p: string) => {
    const u = new URL(url);
    u.pathname = p;
    return u;
  };
  if (rest === "/api/session") return json({ ok: true, authMode: "demo", passwordSet: true, demo: true, reset: (await demoSettings(env)).reset });
  if (rest === "/api/logout" || rest === "/api/login") return json({ ok: true });
  if (rest.startsWith("/api/editor/")) {
    const u = at(rest);
    return editorApi(new Request(u, request), denv, u, { via: "session", who: "demo" });
  }
  if (rest.startsWith("/api/")) return error(404, "Not in the demo.");
  if (rest === "/preview" || rest.startsWith("/preview/")) {
    if (rest.startsWith("/preview/_version/")) return html("<!doctype html><meta charset=utf-8><title>Not in the demo</title><p style='font:16px system-ui;padding:40px'>Past versions are off in the demo.</p>", 404);
    const u = at(rest);
    return noindex(rest === "/preview/_live" || rest.startsWith("/preview/_live/") ? await livePage(denv, u) : await preview(denv, u), true);
  }
  if (rest.startsWith("/staging/")) return staging(denv, at(rest));
  // The editor's own files (scripts, styles, icons). No service worker: the demo is never a home-screen app.
  if (/\.[a-z0-9]+$/i.test(rest)) {
    if (rest === "/sw.js" || rest === "/manifest.webmanifest") return new Response("Not found", { status: 404 });
    return env.ASSETS.fetch(new Request(at("/admin" + rest), request));
  }
  // Any other /demo route: the editor's page, pointed at /demo.
  const shell = await env.ASSETS.fetch(new Request(at("/admin/"), request));
  const text = (await shell.text())
    .replace(/<link rel="manifest"[^>]*>\s*/, "")
    .replace(/(src|href)="\/admin\//g, '$1="/demo/')
    // the page's own early requests (the draft, its state, the problem log) go to the demo too
    .replace(/\("\/api\/editor\//g, '("/demo/api/editor/')
    .replace(/<title>[^<]*<\/title>/, "<title>Editor demo</title>")
    .replace("<head>", '<head>\n    <meta name="aoost-demo" content="1" />');
  return noindex(new Response(text, { status: shell.status, headers: { "Content-Type": "text/html; charset=utf-8" } }), true);
}

/** The demo's settings, kept with the real draft. */
async function demoSettings(env: Env) {
  return cleanDemoSettings(await draftStub({ ...env, IS_DEMO: undefined }).kvGet(DEMO_SETTINGS_KEY));
}

import type { Op } from "../model/ops";
import { renderPage } from "../render/document";
import { searchIndex } from "../render/build";
import type { Identity } from "./auth";
import { draftStub, readDraft, type Env } from "./env";
import { error, html, json, readJson } from "./http";
import { mediaApi } from "./media";
import { buildStatus, publishToGitHub } from "./publish";

/** How recently the connector must have called for the editor to show "Claude connected". */
const CONNECTOR_FRESH_MS = 15 * 60_000;

/** /api/editor/*: every route here is already authenticated. */
export async function editorApi(request: Request, env: Env, url: URL, who: Identity): Promise<Response> {
  if (url.pathname === "/api/editor/media") return mediaApi(request, env, url);
  const draft = draftStub(env);
  const route = `${request.method} ${url.pathname.replace(/^\/api\/editor/, "")}`;

  switch (route) {
    case "GET /site":
      return json({ ok: true, ...(await readDraft(env)) });
    case "GET /state":
      return json({ ok: true, ...(await draft.state()) });
    case "POST /ops": {
      const body = await readJson<{ ops: Op[]; clientId?: string; summary?: string }>(request);
      if (!body || !Array.isArray(body.ops)) return error(400, "Expected { ops: [...] } as JSON.");
      const result = await draft.apply(JSON.stringify(body.ops), body.clientId ?? who.via, body.summary);
      return result.ok ? json(result) : error(422, "That change would make the site invalid.", { issues: result.issues });
    }
    case "POST /reset": {
      const result = await draft.reset(who.via);
      return result.ok ? json(result) : error(500, "The published content is invalid.", { issues: result.issues });
    }
    case "POST /publish": {
      if (!env.GITHUB_TOKEN) return error(503, "Publishing needs GITHUB_TOKEN. See BLOCKERS.md.");
      const body = await readJson<{ message?: string }>(request);
      // Bring in any newer deploy first; publish only a draft that is based on what is live.
      const { blocked } = await draft.sync(true);
      if (blocked) return error(409, blocked + " Choose “Start the draft from the live site” or “Keep my draft” first.");
      const { files, base } = await draft.getPublishFiles();
      const result = await publishToGitHub(files, { repo: env.GITHUB_REPO, branch: env.PUBLISH_BRANCH, token: env.GITHUB_TOKEN, message: body?.message, base });
      if (!result.ok) return error(result.status === 401 || result.status === 403 ? 502 : result.status === 422 || result.status === 409 ? 409 : 502, result.error);
      await draft.markPublished();
      return json({ ok: true, commit: result.commit, url: result.url, changed: result.changed });
    }
    case "POST /conflict": {
      const body = await readJson<{ id?: string; choice?: string }>(request);
      if (!body?.id || (body.choice !== "live" && body.choice !== "mine")) return error(400, 'Expected { id, choice: "live" | "mine" }.');
      const result = await draft.resolveConflict(body.id, body.choice, who.via);
      return result.ok ? json(result) : error(422, "Using the live value would make the site invalid.", { issues: result.issues });
    }
    case "POST /sync/keep":
      await draft.keepDraft();
      return json({ ok: true });
    case "GET /published":
      return new Response(`{"ok":true,"site":${await draft.getPublishedJson()}}`, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    case "GET /publish/status": {
      // The deploy Action that rebuilds the site after a publish: queued, running, done or failed.
      const sha = url.searchParams.get("sha") ?? "";
      if (!/^[0-9a-f]{7,40}$/.test(sha)) return error(400, "Expected ?sha=<commit>.");
      if (!env.GITHUB_TOKEN) return json({ ok: true, state: "unknown" });
      return json({ ok: true, state: await buildStatus(sha, { repo: env.GITHUB_REPO, token: env.GITHUB_TOKEN }) });
    }
    case "POST /screenshot": {
      const body = await readJson<{ requestId: string; png: string | null }>(request);
      if (!body?.requestId) return error(400, "Expected { requestId, png }.");
      await draft.deliverScreenshot(body.requestId, typeof body.png === "string" && body.png.length < 30_000_000 ? body.png : null);
      return json({ ok: true });
    }
    case "GET /claude": {
      // "Connected" means the connector has credentials that work: it made an authenticated call recently.
      const seenAt = await draft.connectorSeenAt();
      return json({ ok: true, connected: !!seenAt && Date.now() - seenAt < CONNECTOR_FRESH_MS, seenAt });
    }
    case "GET /socket":
      return draft.fetch(request);
  }
  return error(404, "No such editor route.");
}

/** /preview/<slug>: the draft, rendered exactly like the public site. */
export async function preview(env: Env, url: URL): Promise<Response> {
  const { site, version } = await readDraft(env);
  const path = url.pathname.replace(/^\/preview/, "") || "/";
  if (path === "/search.json") return json(searchIndex(site).map((e) => ({ ...e, url: "/preview" + e.url })));
  const slug = path.length > 1 ? path.replace(/\/$/, "") : "/";
  const page = site.pages.find((p) => p.slug === slug);
  if (!page) return html("<!doctype html><meta charset=utf-8><title>Not in the draft</title><p style='font:16px system-ui;padding:40px'>No page at this URL in the draft.</p>", 404);
  return html(renderPage(site, page, { preview: { prefix: "/preview" }, assetVersion: String(version) }));
}

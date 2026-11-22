import type { Op } from "../model/ops";
import type { StagingMeta } from "../model/protocol";
import { renderPage } from "../render/document";
import { validateSite } from "../schema";
import { searchIndex } from "../render/build";
import type { Identity } from "./auth";
import { draftStub, readDraft, type Env } from "./env";
import { error, html, json, readJson } from "./http";
import { mediaApi } from "./media";
import { problemsReport } from "../model/problems";
import { buildStatus, publishToGitHub } from "./publish";
import { cachedVersionFiles, listVersions } from "./history";
import { CommentOp } from "../model/comments";
import { filesToSite } from "../schema";

/** How recently the connector must have called for the editor to show "Claude connected". */
const CONNECTOR_FRESH_MS = 15 * 60_000;

/** /api/editor/*: every route here is already authenticated. */
const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost");

/**
 * A test server never publishes, whatever credentials it has: a test run once clicked
 * Publish on one and changed the live homepage. Test servers sign in with the password
 * (production uses Cloudflare Access), and wrangler dev reports the real domain, so the
 * sign-in mode is the reliable sign. ALLOW_LOCAL_PUBLISH=1 lifts it deliberately.
 */
function publishLocked(env: Env, url: URL): Response | null {
  if ((env.AUTH_MODE === "password" || isLocalHost(url.hostname)) && env.ALLOW_LOCAL_PUBLISH !== "1") return error(403, "Publishing is off on a local test server.");
  if (!env.GITHUB_TOKEN) return error(503, "Publishing needs GITHUB_TOKEN. See BLOCKERS.md.");
  return null;
}

/** The link is a path: the editor adds its own address (wrangler dev reports the real domain as the origin). */
/** The name to sign a publish with: the part of a sign-in email before the @ (password and token sign-ins have none). */
const byline = (who: Identity) => (who.who.includes("@") ? who.who.split("@")[0]!.slice(0, 40) : null);

const stagingInfo = (meta: StagingMeta) => ({ at: meta.at, label: meta.label, by: meta.by, path: `/staging/${meta.token}/` });

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
      const body = await readJson<{ ops: Op[]; clientId?: string; summary?: string; author?: string }>(request);
      if (!body || !Array.isArray(body.ops)) return error(400, "Expected { ops: [...] } as JSON.");
      const by = (typeof body.author === "string" && body.author.trim().slice(0, 40)) || byline(who) || "Someone";
      const result = await draft.apply(JSON.stringify(body.ops), body.clientId ?? who.via, body.summary, undefined, by);
      return result.ok ? json(result) : error(422, "That change would make the site invalid.", { issues: result.issues });
    }
    case "POST /reset": {
      const result = await draft.reset(who.via);
      return result.ok ? json(result) : error(500, "The published content is invalid.", { issues: result.issues });
    }
    case "POST /publish": {
      const locked = publishLocked(env, url);
      if (locked) return locked;
      const body = await readJson<{ message?: string }>(request);
      // Bring in any newer deploy first; publish only a draft that is based on what is live.
      const { blocked } = await draft.sync(true);
      if (blocked) return error(409, blocked + " Choose “Start the draft from the live site” or “Keep my draft” first.");
      const { files, base } = await draft.getPublishFiles();
      const result = await publishToGitHub(files, { repo: env.GITHUB_REPO, branch: env.PUBLISH_BRANCH, token: env.GITHUB_TOKEN!, message: body?.message, by: byline(who), base });
      if (!result.ok) return error(result.status === 401 || result.status === 403 ? 502 : result.status === 422 || result.status === 409 ? 409 : 502, result.error);
      await draft.markPublished();
      return json({ ok: true, commit: result.commit, url: result.url, changed: result.changed });
    }
    case "GET /history": {
      if (!env.GITHUB_TOKEN) return json({ ok: true, versions: [], unavailable: "Version history reads the site's GitHub history, which this server can't reach (no GITHUB_TOKEN). It works on the live editor." });
      try {
        const limit = Number(url.searchParams.get("limit") ?? 30) || 30;
        return json({ ok: true, versions: await listVersions({ repo: env.GITHUB_REPO, branch: env.PUBLISH_BRANCH, token: env.GITHUB_TOKEN }, limit) });
      } catch (e) {
        return error(502, `Couldn't read the history from GitHub: ${e instanceof Error ? e.message : "unknown error"}.`);
      }
    }
    case "GET /history/version": {
      if (!env.GITHUB_TOKEN) return error(503, "Version history needs GITHUB_TOKEN.");
      const sha = url.searchParams.get("sha") ?? "";
      try {
        const parsed = validateSite(filesToSite(await cachedVersionFiles(sha, { repo: env.GITHUB_REPO, branch: env.PUBLISH_BRANCH, token: env.GITHUB_TOKEN })));
        if (!parsed.ok) return error(422, "That version can't be read by this editor.", { issues: parsed.issues });
        return json({ ok: true, site: parsed.site });
      } catch (e) {
        return error((e as { status?: number }).status === 400 ? 400 : 502, `Couldn't read that version: ${e instanceof Error ? e.message : "unknown error"}.`);
      }
    }
    case "GET /staging": {
      const meta = await draft.getStaging();
      return json({ ok: true, staging: meta?.at ? stagingInfo(meta) : null });
    }
    case "POST /staging": {
      const body = await readJson<{ label?: string }>(request);
      const meta = await draft.stage(body?.label?.trim() || "Draft", who.who);
      return json({ ok: true, staging: stagingInfo(meta) });
    }
    case "DELETE /staging":
      await draft.clearStaging(url.searchParams.get("forget") === "1");
      return json({ ok: true });
    case "POST /staging/push": {
      const locked = publishLocked(env, url);
      if (locked) return locked;
      const { blocked } = await draft.sync(true);
      if (blocked) return error(409, blocked + " Sort that out first, then send to staging again.");
      const staged = await draft.getStagedForPush();
      if (!staged) return error(409, "Nothing is in staging.");
      if (staged.liveMoved) return error(409, "The live site changed after this was sent to staging. Send it to staging again, check the link, then push.");
      const body = await readJson<{ message?: string }>(request);
      const label = (await draft.getStaging())?.label;
      const message = body?.message || `Push to production${label ? `: ${label}` : ""}`;
      const result = await publishToGitHub(staged.files, { repo: env.GITHUB_REPO, branch: env.PUBLISH_BRANCH, token: env.GITHUB_TOKEN!, message, by: byline(who), base: staged.base });
      if (!result.ok) return error(result.status === 401 || result.status === 403 ? 502 : result.status === 422 || result.status === 409 ? 409 : 502, result.error);
      await draft.markPublished(staged.files);
      await draft.clearStaging();
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
    case "GET /activity":
      return json({ ok: true, entries: await draft.getActivity() });
    case "GET /comments":
      return json({ ok: true, threads: await draft.getComments() });
    case "POST /comments": {
      const parsed = CommentOp.safeParse(await readJson<unknown>(request));
      if (!parsed.success) return error(400, "That comment doesn't fit (too long, empty, or missing a field).");
      const result = await draft.commentOp(JSON.stringify(parsed.data), who.who);
      return result.ok ? json({ ok: true, threads: result.threads }) : error(409, result.error);
    }
    case "POST /problems": {
      const body = await readJson<{ items?: unknown }>(request);
      return json({ ok: true, kept: await draft.addProblems(body?.items, who.who) });
    }
    case "GET /problems": {
      const items = await draft.getProblems();
      const limit = Math.max(1, Math.min(400, Number(url.searchParams.get("limit") ?? 100) || 100));
      if (url.searchParams.get("format") === "text") return new Response(problemsReport(items, limit), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      return json({ ok: true, items: items.slice(-limit) });
    }
    case "DELETE /problems":
      await draft.clearProblems();
      return json({ ok: true });
    case "GET /refs": {
      const page = url.searchParams.get("page") ?? "";
      if (!/^[\w:-]{1,80}$/.test(page)) return error(400, "Expected ?page=<page id>.");
      return json({ ok: true, items: await draft.getRefs(page) });
    }
    case "PUT /refs": {
      const body = await readJson<{ page?: string; items?: unknown }>(request);
      if (!body?.page || !/^[\w:-]{1,80}$/.test(body.page)) return error(400, "Expected { page, items }.");
      return json({ ok: true, items: await draft.putRefs(body.page, body.items) });
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

const STAGING_TAG = `<div style="position:fixed;left:12px;bottom:12px;z-index:2147483647;font:600 11px/1 system-ui,sans-serif;letter-spacing:.02em;color:#fff;background:#8e44ff;padding:7px 10px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none" aria-hidden="true">Staging preview</div>`;

/** /staging/<token>/<slug>: what staging holds, rendered exactly like the public site. Public: the token is the key. */
export async function staging(env: Env, url: URL): Promise<Response> {
  const m = /^\/staging\/([\w-]{16,64})(\/.*)?$/.exec(url.pathname);
  const notFound = () => html("<!doctype html><meta charset=utf-8><meta name=robots content=noindex><title>Not found</title><p style='font:16px system-ui;padding:40px'>This staging link isn't active. Ask for a new one.</p>", 404);
  if (!m) return notFound();
  const token = m[1]!;
  if (!m[2]) return Response.redirect(new URL(`/staging/${token}/`, url).toString(), 301);
  const text = await draftStub(env).getStagedSiteJson(token);
  if (!text) return notFound();
  const parsed = validateSite(JSON.parse(text));
  if (!parsed.ok) return notFound();
  const site = parsed.site;
  const prefix = `/staging/${token}`;
  const path = m[2].replace(/\/$/, "") || "/";
  if (path === "/search.json") return json(searchIndex(site).map((e) => ({ ...e, url: prefix + e.url })));
  const page = site.pages.find((p) => p.slug === path && p.status !== "draft" && p.variantOf === undefined);
  if (!page) return html("<!doctype html><meta charset=utf-8><meta name=robots content=noindex><title>Not in staging</title><p style='font:16px system-ui;padding:40px'>No page at this address in staging.</p>", 404);
  const body = renderPage(site, page, { preview: { prefix }, assetVersion: "staging" }).replace("</body>", `${STAGING_TAG}</body>`);
  const res = html(body);
  res.headers.set("X-Robots-Tag", "noindex");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** /preview/_version/<sha>/<slug> (an address no page can have): a past version, rendered exactly like the site. Behind the editor sign-in. */
export async function historyPage(env: Env, url: URL): Promise<Response> {
  const m = /^\/preview\/_version\/([0-9a-f]{7,40})(\/.*)?$/.exec(url.pathname);
  if (!m) return html("<!doctype html><meta charset=utf-8><title>Not found</title><p style='font:16px system-ui;padding:40px'>No such version.</p>", 404);
  const sha = m[1]!;
  if (!m[2]) return Response.redirect(new URL(`/preview/_version/${sha}/`, url).toString(), 301);
  if (!env.GITHUB_TOKEN) return html("<!doctype html><meta charset=utf-8><title>History unavailable</title><p style='font:16px system-ui;padding:40px'>Version history needs GITHUB_TOKEN.</p>", 503);
  let site;
  try {
    const parsed = validateSite(filesToSite(await cachedVersionFiles(sha, { repo: env.GITHUB_REPO, branch: env.PUBLISH_BRANCH, token: env.GITHUB_TOKEN })));
    if (!parsed.ok) throw new Error("invalid");
    site = parsed.site;
  } catch {
    return html("<!doctype html><meta charset=utf-8><title>Can't show this version</title><p style='font:16px system-ui;padding:40px'>This version couldn't be read.</p>", 502);
  }
  const prefix = `/preview/_version/${sha}`;
  const path = m[2].replace(/\/$/, "") || "/";
  if (path === "/search.json") return json(searchIndex(site).map((e) => ({ ...e, url: prefix + e.url })));
  // Signed in, like /preview: draft pages show too (only variants never do).
  const page = site.pages.find((p) => p.slug === path && p.variantOf === undefined);
  if (!page) return html("<!doctype html><meta charset=utf-8><title>Not in this version</title><p style='font:16px system-ui;padding:40px'>No page at this address in this version.</p>", 404);
  const tag = STAGING_TAG.replace("Staging preview", `Version ${sha.slice(0, 7)}`).replace("#8e44ff", "#444");
  return html(renderPage(site, page, { preview: { prefix }, assetVersion: sha.slice(0, 12) }).replace("</body>", `${tag}</body>`));
}

/** /preview/_live/<slug>: what is live now (the published content), for comparing. Behind the editor sign-in. */
export async function livePage(env: Env, url: URL): Promise<Response> {
  const parsed = validateSite(JSON.parse(await draftStub(env).getPublishedJson()));
  if (!parsed.ok) return html("<!doctype html><meta charset=utf-8><title>Can't show the live site</title><p style='font:16px system-ui;padding:40px'>The live content couldn't be read.</p>", 502);
  const site = parsed.site;
  const prefix = "/preview/_live";
  const path = url.pathname.slice(prefix.length).replace(/\/$/, "") || "/";
  if (path === "/search.json") return json(searchIndex(site).map((e) => ({ ...e, url: prefix + e.url })));
  const page = site.pages.find((p) => p.slug === path && p.variantOf === undefined);
  if (!page) return html("<!doctype html><meta charset=utf-8><title>Not live</title><p style='font:16px system-ui;padding:40px'>This page isn't on the live site yet.</p>", 404);
  return html(renderPage(site, page, { preview: { prefix }, assetVersion: "live" }));
}

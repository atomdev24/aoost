import { DurableObject } from "cloudflare:workers";
import "../components/registry";
import { deepEqual, getAt, mergeFiles, pathLabel, serialize, setAt, type PathSeg } from "../model/merge";
import { applyOps, diffSite, type Op } from "../model/ops";
import type { ClientMessage, EditorContext, ServerMessage, StagingMeta, SyncInfo } from "../model/protocol";
import { filesToSite, siteToFiles, validateSite, type Breakpoint, type ContentFiles, type Issue, type Site } from "../schema";
import type { Env } from "./env";
import { cleanRefs, type RefItem } from "../model/refs";
import { appendProblems, cleanProblems, type StoredProblem } from "../model/problems";

const same = (a: ContentFiles, b: ContentFiles) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => a[k] === b[k]);
};

export type ApplyResult = { ok: true; version: number } | { ok: false; issues: Issue[] };
export type DraftState = { version: number; dirty: boolean; editors: number; context: EditorContext | null; sync: SyncInfo };

/** A short fingerprint of a set of content files (order-independent). */
async function fingerprint(files: ContentFiles): Promise<string> {
  const text = JSON.stringify(Object.keys(files).sort().map((k) => [k, files[k]]));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const FILE = "file:";
/** Fingerprint of the deployed build at the moment we last published. */
const PUB_BASE = "pubBase";
/** Snapshot of what was last published from here, until the next deploy catches up. */
const PUB = "pub:";
const PUBLISHED_URL = "https://assets.local/_published.json";
/** The live content the draft last matched (its "base"), and its fingerprint: the common ancestor for merging a newer deploy. */
const BASE = "base:";
/** Reference images per page on the editor board (never published). */
const REFS = "refs:";
/** The editor's problem log (errors, failed requests, freezes, reports). */
const PROBLEMS = "problems";
const BASE_FP = "baseFp";
/** Values both sides changed differently in the last merge (the draft kept its own). */
const CONFLICTS = "conflicts";
/** A newer deploy that couldn't be merged (the result was invalid), until Alex chooses what to do. */
const BLOCKED = "syncBlocked";
const SYNCED_AT = "syncedAt";
/** Staging: a frozen copy of the draft to share and then push to production (files, the base they were built on, and meta). */
const STG_FILE = "stg:f:";
const STG_BASE = "stg:b:";
const STG_META = "stg:meta";
/** How often requests check for a newer deploy (publish always checks). */
const SYNC_EVERY_MS = 5000;

/** Where a conflict is; its two values are read from the draft and the base (= live) when shown. */
type StoredConflict = { id: string; file: string; path: PathSeg[] };
type Blocked = { liveFp: string; reason: string };
const preview = (v: unknown) => (v === undefined ? "(removed)" : JSON.stringify(v).slice(0, 140));
const parse = (text: string | undefined): unknown => (text === undefined ? undefined : JSON.parse(text));

/**
 * The working draft for the site (SPEC §2). It stores the same files that
 * live in content/, so publishing is "commit these files". Every change
 * arrives as ops, is validated against the schema, saved, and broadcast to
 * open editors over WebSocket. Nothing here is live until Publish.
 */
export class DraftStore extends DurableObject<Env> {
  private site: Site | null = null;
  private version = 0;
  private waiting = new Map<string, (png: string | null) => void>();
  private lastSyncCheck = 0;
  private syncing: Promise<{ blocked: string | null }> | null = null;

  /** The live content: the snapshot from our last publish if there is one, else what this deploy was built from. */
  private async published(): Promise<ContentFiles> {
    const snapshot = await this.ctx.storage.list<string>({ prefix: PUB });
    if (snapshot.size) {
      const built = await this.built().catch(() => null);
      const files: ContentFiles = {};
      for (const [key, value] of snapshot) files[key.slice(PUB.length)] = value;
      if (built) {
        // Once a deploy contains exactly this snapshot, it is no longer needed.
        // And if a newer deploy has landed since we published (content changed in
        // git, not through this editor), the deploy is the truth: drop the snapshot.
        const base = await this.ctx.storage.get<string>(PUB_BASE);
        const movedOn = base === undefined || base !== (await fingerprint(built));
        if (same(built, files) || movedOn) {
          await this.ctx.storage.delete([...snapshot.keys(), PUB_BASE]);
          return built;
        }
      }
      return files;
    }
    return this.built();
  }

  private async built(): Promise<ContentFiles> {
    const res = await this.env.ASSETS.fetch(PUBLISHED_URL);
    if (!res.ok) throw new Error("published content is missing from the build (_published.json)");
    return (await res.json()) as ContentFiles;
  }

  private async load(): Promise<Site> {
    if (this.site) return this.site;
    this.version = (await this.ctx.storage.get<number>("version")) ?? 0;
    const stored = await this.ctx.storage.list<string>({ prefix: FILE });
    let files: ContentFiles = {};
    for (const [key, value] of stored) files[key.slice(FILE.length)] = value;
    const fresh = !stored.size;
    if (fresh) files = await this.published(); // first run: start from what is live
    const result = validateSite(filesToSite(files));
    if (!result.ok) throw new Error("stored draft is invalid: " + JSON.stringify(result.issues.slice(0, 5)));
    this.site = result.site;
    if (fresh) await this.setBase(files);
    return this.site;
  }

  private async save(site: Site) {
    const files = siteToFiles(site);
    const existing = await this.ctx.storage.list<string>({ prefix: FILE });
    const puts: Record<string, string> = {};
    for (const [path, body] of Object.entries(files)) if (existing.get(FILE + path) !== body) puts[FILE + path] = body;
    const gone = [...existing.keys()].filter((k) => !(k.slice(FILE.length) in files));
    this.version += 1;
    await this.ctx.storage.put({ ...puts, version: this.version });
    if (gone.length) await this.ctx.storage.delete(gone);
    this.site = site;
  }

  // ------------------------------------------------------------ base and sync

  private async setBase(files: ContentFiles, fp?: string) {
    const old = await this.ctx.storage.list<string>({ prefix: BASE });
    if (old.size) await this.ctx.storage.delete([...old.keys()]);
    await this.ctx.storage.put<string>({ ...Object.fromEntries(Object.entries(files).map(([path, body]) => [BASE + path, body])), [BASE_FP]: fp ?? (await fingerprint(files)) });
  }

  private async base(): Promise<ContentFiles> {
    const files: ContentFiles = {};
    for (const [key, value] of await this.ctx.storage.list<string>({ prefix: BASE })) files[key.slice(BASE.length)] = value;
    return files;
  }

  /**
   * Bring a newer deploy into the draft. When the live content differs from
   * the draft's base (content changed in git, not through this editor), merge
   * it in three ways per file, set the new base, save and tell open editors.
   * Our own publish landing changes nothing: the base is then what we published.
   * Returns why it couldn't merge, if it couldn't.
   */
  async sync(force = false): Promise<{ blocked: string | null }> {
    // Callers that arrive while a sync runs wait for it, so the editor's first load sees its outcome.
    if (this.syncing) return this.syncing;
    this.syncing = this.syncOnce(force).finally(() => (this.syncing = null));
    return this.syncing;
  }

  private async syncOnce(force: boolean): Promise<{ blocked: string | null }> {
    const now = Date.now();
    if (!force && now - this.lastSyncCheck < SYNC_EVERY_MS) return { blocked: (await this.ctx.storage.get<Blocked>(BLOCKED))?.reason ?? null };
    this.lastSyncCheck = now;
    const before = await this.load();
    let live: ContentFiles;
    try {
      live = await this.published();
    } catch {
      return { blocked: null }; // no build to compare with (tests, local dev before a build)
    }
    const liveFp = await fingerprint(live);
    const baseFp = await this.ctx.storage.get<string>(BASE_FP);
    // A draft from before bases were recorded: take what is live now as its base.
    if (baseFp === undefined) return await this.setBase(live, liveFp), { blocked: null };
    if (baseFp === liveFp) return { blocked: null };
    const blocked = await this.ctx.storage.get<Blocked>(BLOCKED);
    if (blocked?.liveFp === liveFp) return { blocked: blocked.reason };

    const draft = siteToFiles(before);
    const merged = mergeFiles(await this.base(), draft, live);
    let result: ReturnType<typeof validateSite>;
    try {
      result = validateSite(filesToSite(merged.files));
    } catch (e) {
      result = { ok: false, issues: [{ path: "", message: e instanceof Error ? e.message : String(e) }] };
    }
    if (!result.ok) {
      const first = result.issues[0];
      const reason = `The live site changed, and merging it into your draft would make the site invalid${first ? ` (${first.path ? first.path + ": " : ""}${first.message})` : ""}.`;
      await this.ctx.storage.put<Blocked>(BLOCKED, { liveFp, reason });
      this.broadcast({ type: "sync-blocked", reason });
      return { blocked: reason };
    }

    // Earlier conflicts stay listed while the draft and the live site still disagree there.
    const old = (await this.ctx.storage.get<StoredConflict[]>(CONFLICTS)) ?? [];
    const mergedFiles = siteToFiles(result.site);
    const still = old.filter((c) => !deepEqual(getAt(parse(live[c.file]), c.path), getAt(parse(mergedFiles[c.file]), c.path)));
    const fresh = merged.conflicts.map((c) => ({ id: c.file + "#" + JSON.stringify(c.path), file: c.file, path: c.path }));
    const conflicts = [...still.filter((c) => !fresh.some((f) => f.id === c.id)), ...fresh];

    await this.save(result.site);
    await this.setBase(live, liveFp);
    await this.ctx.storage.put({ [CONFLICTS]: conflicts, [SYNCED_AT]: now });
    await this.ctx.storage.delete(BLOCKED);
    const ops = diffSite(before, result.site);
    if (ops.length) this.broadcast({ type: "ops", ops, version: this.version, origin: "sync", summary: "Updated from the live site" });
    this.broadcast({ type: "synced", at: now, conflicts: conflicts.length });
    return { blocked: null };
  }

  private async syncInfo(): Promise<SyncInfo> {
    const conflicts = (await this.ctx.storage.get<StoredConflict[]>(CONFLICTS)) ?? [];
    const draft = conflicts.length ? siteToFiles(await this.load()) : {};
    const live = conflicts.length ? await this.base() : {};
    return {
      at: (await this.ctx.storage.get<number>(SYNCED_AT)) ?? null,
      conflicts: conflicts.map((c) => ({ id: c.id, label: pathLabel(c.file, c.path), draft: preview(getAt(parse(draft[c.file]), c.path)), live: preview(getAt(parse(live[c.file]), c.path)) })),
      blocked: (await this.ctx.storage.get<Blocked>(BLOCKED))?.reason ?? null,
    };
  }

  /** Settle one conflict: "live" takes the live site's value, "mine" keeps the draft's. */
  async resolveConflict(id: string, choice: "live" | "mine", origin: string): Promise<ApplyResult> {
    const conflicts = (await this.ctx.storage.get<StoredConflict[]>(CONFLICTS)) ?? [];
    const c = conflicts.find((x) => x.id === id);
    if (!c) return { ok: true, version: this.version };
    if (choice === "live") {
      const before = await this.load();
      const files = siteToFiles(before);
      const value = getAt(parse((await this.base())[c.file]), c.path);
      const root = setAt(parse(files[c.file]), c.path, value);
      if (root === undefined) delete files[c.file];
      else files[c.file] = serialize(root);
      let result: ReturnType<typeof validateSite>;
      try {
        result = validateSite(filesToSite(files));
      } catch (e) {
        result = { ok: false, issues: [{ path: c.file, message: e instanceof Error ? e.message : String(e) }] };
      }
      if (!result.ok) return { ok: false, issues: result.issues };
      await this.save(result.site);
      this.broadcast({ type: "ops", ops: diffSite(before, result.site), version: this.version, origin, summary: "Used the live value" }, origin);
    }
    await this.ctx.storage.put(CONFLICTS, conflicts.filter((x) => x.id !== id));
    return { ok: true, version: this.version };
  }

  /** A blocked merge: keep the draft as it is and treat the current live site as its base. */
  async keepDraft() {
    const live = await this.published();
    await this.setBase(live);
    await this.ctx.storage.delete(BLOCKED);
  }

  /** What publish needs: the draft and the base it was built on. */
  async getPublishFiles(): Promise<{ files: ContentFiles; base: ContentFiles }> {
    return { files: siteToFiles(await this.load()), base: await this.base() };
  }

  // ------------------------------------------------------------- RPC

  /** The draft as JSON text (RPC can't type arbitrary content, so it travels as a string). */
  async getSiteJson(): Promise<{ json: string; version: number }> {
    await this.sync();
    return { json: JSON.stringify(await this.load()), version: this.version };
  }

  async getFiles(): Promise<ContentFiles> {
    return siteToFiles(await this.load());
  }

  /** Apply ops to the draft. Rejects anything that would make the site invalid. */
  async apply(opsJson: string, origin: string, summary?: string, changedNodeIds?: string[]): Promise<ApplyResult> {
    const ops = JSON.parse(opsJson) as Op[];
    const result = validateSite(applyOps(await this.load(), ops));
    if (!result.ok) return { ok: false, issues: result.issues };
    await this.save(result.site);
    this.broadcast({ type: "ops", ops, version: this.version, origin, summary, changedNodeIds }, origin);
    return { ok: true, version: this.version };
  }

  /** Throw the draft away and start again from the published content. */
  async reset(origin: string): Promise<ApplyResult> {
    const live = await this.published();
    const result = validateSite(filesToSite(live));
    if (!result.ok) return { ok: false, issues: result.issues };
    const before = await this.load();
    await this.save(result.site);
    await this.setBase(live);
    await this.ctx.storage.delete([CONFLICTS, BLOCKED]);
    this.broadcast({ type: "ops", ops: diffSite(before, result.site), version: this.version, origin, summary: "Reset to published" }, origin);
    return { ok: true, version: this.version };
  }

  async state(): Promise<DraftState> {
    await this.sync();
    const draft = siteToFiles(await this.load());
    let dirty = true;
    try {
      dirty = !same(draft, await this.published());
    } catch {
      // no published snapshot: treat as dirty
    }
    return { version: this.version, dirty, editors: this.ctx.getWebSockets().length, context: (await this.ctx.storage.get<EditorContext>("context")) ?? null, sync: await this.syncInfo() };
  }

  /** Add entries to the problem log; returns how many were kept. */
  async addProblems(items: unknown, who: string): Promise<number> {
    const clean = cleanProblems(items);
    if (!clean.length) return 0;
    const stored = (await this.ctx.storage.get<StoredProblem[]>(PROBLEMS)) ?? [];
    await this.ctx.storage.put(PROBLEMS, appendProblems(stored, clean, who));
    return clean.length;
  }

  async getProblems(): Promise<StoredProblem[]> {
    return (await this.ctx.storage.get<StoredProblem[]>(PROBLEMS)) ?? [];
  }

  async clearProblems() {
    await this.ctx.storage.delete(PROBLEMS);
  }

  /** A page's reference images on the board (editor only; never part of the site's content). */
  async getRefs(pageId: string): Promise<RefItem[]> {
    return (await this.ctx.storage.get<RefItem[]>(REFS + pageId)) ?? [];
  }

  async putRefs(pageId: string, items: unknown): Promise<RefItem[]> {
    const clean = cleanRefs(items);
    if (clean.length) await this.ctx.storage.put(REFS + pageId, clean);
    else await this.ctx.storage.delete(REFS + pageId);
    return clean;
  }

  /** The Claude connector made an authenticated call (shown as "Claude connected" in the editor). */
  async noteConnector(now = Date.now()) {
    const last = (await this.ctx.storage.get<number>("connectorSeenAt")) ?? 0;
    if (now - last > 30_000) await this.ctx.storage.put("connectorSeenAt", now);
  }

  async connectorSeenAt(): Promise<number | null> {
    return (await this.ctx.storage.get<number>("connectorSeenAt")) ?? null;
  }

  /** What is live (as site JSON), so the editor can say which pages and blocks a publish would change. */
  async getPublishedJson(): Promise<string> {
    return JSON.stringify(filesToSite(await this.published()));
  }

  // ------------------------------------------------------------- staging

  /** Freeze the draft as it is now into staging; keeps the share link if there is one. */
  async stage(label: string, by: string): Promise<StagingMeta> {
    const files = siteToFiles(await this.load());
    const base = await this.base();
    const old = await this.ctx.storage.get<StagingMeta>(STG_META);
    await this.clearStagingFiles();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const token = old?.token ?? btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const meta: StagingMeta = { token, at: Date.now(), label: label.slice(0, 120), by, baseFp: (await this.ctx.storage.get<string>(BASE_FP)) ?? (await fingerprint(base)) };
    const puts: Record<string, unknown> = { [STG_META]: meta };
    for (const [path, body] of Object.entries(files)) puts[STG_FILE + path] = body;
    for (const [path, body] of Object.entries(base)) puts[STG_BASE + path] = body;
    // storage.put takes at most 128 keys at once.
    const entries = Object.entries(puts);
    for (let i = 0; i < entries.length; i += 100) await this.ctx.storage.put(Object.fromEntries(entries.slice(i, i + 100)));
    this.broadcast({ type: "staging", meta });
    return meta;
  }

  private async clearStagingFiles() {
    const keys = [...(await this.ctx.storage.list({ prefix: STG_FILE })).keys(), ...(await this.ctx.storage.list({ prefix: STG_BASE })).keys()];
    for (let i = 0; i < keys.length; i += 100) await this.ctx.storage.delete(keys.slice(i, i + 100));
  }

  async getStaging(): Promise<StagingMeta | null> {
    return (await this.ctx.storage.get<StagingMeta>(STG_META)) ?? null;
  }

  /** The staged site as JSON text, for the share link (null when the token doesn't match). */
  async getStagedSiteJson(token: string): Promise<string | null> {
    const meta = await this.getStaging();
    if (!meta?.at || meta.token !== token) return null;
    return JSON.stringify(filesToSite(await this.stagedFiles(STG_FILE)));
  }

  private async stagedFiles(prefix: string): Promise<ContentFiles> {
    const files: ContentFiles = {};
    for (const [key, value] of await this.ctx.storage.list<string>({ prefix })) files[key.slice(prefix.length)] = value;
    return files;
  }

  /** What Push to production publishes, and whether the live site moved on since it was staged. */
  async getStagedForPush(): Promise<{ files: ContentFiles; base: ContentFiles; liveMoved: boolean } | null> {
    const meta = await this.getStaging();
    if (!meta?.at) return null;
    const baseFp = (await this.ctx.storage.get<string>(BASE_FP)) ?? "";
    return { files: await this.stagedFiles(STG_FILE), base: await this.stagedFiles(STG_BASE), liveMoved: baseFp !== meta.baseFp };
  }

  /** Empty staging. Keeps the share link's token unless `forget` (a new link next time). */
  async clearStaging(forget = false) {
    await this.clearStagingFiles();
    const meta = await this.getStaging();
    if (forget || !meta) await this.ctx.storage.delete(STG_META);
    else await this.ctx.storage.put(STG_META, { ...meta, at: 0, label: "" });
    this.broadcast({ type: "staging", meta: null });
  }

  /** Record that the current draft (or the given files, from staging) is now what is published. */
  async markPublished(published?: ContentFiles) {
    const files = published ?? siteToFiles(await this.load());
    const old = await this.ctx.storage.list<string>({ prefix: PUB });
    if (old.size) await this.ctx.storage.delete([...old.keys()]);
    await this.ctx.storage.put(Object.fromEntries(Object.entries(files).map(([path, body]) => [PUB + path, body])));
    const built = await this.built().catch(() => null);
    if (built) await this.ctx.storage.put(PUB_BASE, await fingerprint(built));
    // What we just published is now the base: when its deploy lands there is nothing to merge.
    await this.setBase(files);
    this.broadcast({ type: "published", version: this.version });
  }

  /** Ask an open editor to capture its preview (fallback for get_preview_screenshot). */
  async requestScreenshot(pageId: string, breakpoint: Breakpoint, timeoutMs = 15000): Promise<string | null> {
    if (!this.ctx.getWebSockets().length) return null;
    const requestId = crypto.randomUUID();
    this.broadcast({ type: "screenshot-request", requestId, pageId, breakpoint });
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiting.delete(requestId);
        resolve(null);
      }, timeoutMs);
      this.waiting.set(requestId, (png) => {
        clearTimeout(timer);
        resolve(png);
      });
    });
  }

  /** The editor posts its capture back here. */
  async deliverScreenshot(requestId: string, png: string | null) {
    this.waiting.get(requestId)?.(png);
    this.waiting.delete(requestId);
  }

  // ------------------------------------------------------- WebSocket

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    await this.load();
    const pair = new WebSocketPair();
    const clientId = crypto.randomUUID();
    this.ctx.acceptWebSocket(pair[1], [clientId]);
    pair[1].send(JSON.stringify({ type: "hello", version: this.version, clientId } satisfies ServerMessage));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMessage;
    } catch {
      return;
    }
    if (msg.type === "context") {
      await this.ctx.storage.put("context", { ...msg.context, updatedAt: Date.now() } satisfies EditorContext);
    } else if (msg.type === "screenshot") {
      this.waiting.get(msg.requestId)?.(msg.png);
      this.waiting.delete(msg.requestId);
    } else if (msg.type === "ping") {
      ws.send('{"type":"pong"}');
    }
  }

  async webSocketClose(ws: WebSocket) {
    try {
      ws.close();
    } catch {
      // already closed
    }
  }

  private broadcast(message: ServerMessage, exceptClient?: string) {
    const text = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      if (exceptClient && this.ctx.getTags(ws).includes(exceptClient)) continue;
      try {
        ws.send(text);
      } catch {
        // socket is gone; the runtime cleans it up
      }
    }
  }
}

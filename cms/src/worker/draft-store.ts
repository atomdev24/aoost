import { DurableObject } from "cloudflare:workers";
import "../components/registry";
import { applyOps, type Op } from "../model/ops";
import type { ClientMessage, EditorContext, ServerMessage } from "../model/protocol";
import { filesToSite, siteToFiles, validateSite, type Breakpoint, type ContentFiles, type Issue, type Site } from "../schema";
import type { Env } from "./env";

const same = (a: ContentFiles, b: ContentFiles) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => a[k] === b[k]);
};

export type ApplyResult = { ok: true; version: number } | { ok: false; issues: Issue[] };
export type DraftState = { version: number; dirty: boolean; editors: number; context: EditorContext | null };

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
    if (!stored.size) files = await this.published(); // first run: start from what is live
    const result = validateSite(filesToSite(files));
    if (!result.ok) throw new Error("stored draft is invalid: " + JSON.stringify(result.issues.slice(0, 5)));
    this.site = result.site;
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

  // ------------------------------------------------------------- RPC

  /** The draft as JSON text (RPC can't type arbitrary content, so it travels as a string). */
  async getSiteJson(): Promise<{ json: string; version: number }> {
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
    const result = validateSite(filesToSite(await this.published()));
    if (!result.ok) return { ok: false, issues: result.issues };
    const before = await this.load();
    await this.save(result.site);
    const { diffSite } = await import("../model/ops");
    this.broadcast({ type: "ops", ops: diffSite(before, result.site), version: this.version, origin, summary: "Reset to published" }, origin);
    return { ok: true, version: this.version };
  }

  async state(): Promise<DraftState> {
    const draft = siteToFiles(await this.load());
    let dirty = true;
    try {
      dirty = !same(draft, await this.published());
    } catch {
      // no published snapshot: treat as dirty
    }
    return { version: this.version, dirty, editors: this.ctx.getWebSockets().length, context: (await this.ctx.storage.get<EditorContext>("context")) ?? null };
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

  /** Record that the current draft is now what is published. */
  async markPublished() {
    const files = siteToFiles(await this.load());
    const old = await this.ctx.storage.list<string>({ prefix: PUB });
    if (old.size) await this.ctx.storage.delete([...old.keys()]);
    await this.ctx.storage.put(Object.fromEntries(Object.entries(files).map(([path, body]) => [PUB + path, body])));
    const built = await this.built().catch(() => null);
    if (built) await this.ctx.storage.put(PUB_BASE, await fingerprint(built));
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

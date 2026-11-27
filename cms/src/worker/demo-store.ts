import { demoSite } from "../demo/site";
import { unsafeForDemo } from "../demo/safety";
import { applyOps, diffSite, type Op } from "../model/ops";
import { siteToFiles, type ContentFiles } from "../schema";
import { DraftStore } from "./draft-store";

/**
 * The demo editor's draft (/demo/): the same store as the real one, started from the wireframe
 * demo site instead of what is live, and kept apart from it (its own Durable Object). Anyone with
 * the link can edit it; "Reset demo" and a nightly job put it back.
 */
export class DemoStore extends DraftStore {
  /** "Live" for the demo is the wireframe site (or whatever was last pretend-published). */
  protected override async built(): Promise<ContentFiles> {
    return siteToFiles(demoSite());
  }

  override async apply(opsJson: string, origin: string, summary?: string, changedNodeIds?: string[], by?: string) {
    const ops = JSON.parse(opsJson) as Op[];
    const why = unsafeForDemo(applyOps(await this.load(), ops));
    if (why) return { ok: false as const, issues: [{ path: "", message: why }] };
    return super.apply(opsJson, origin, summary, changedNodeIds, by);
  }

  /** The connector never talks to the demo. */
  override async noteConnector() {}

  /** Back to the wireframe site: draft, comments, activity, staging and history all go. */
  async wipe(): Promise<void> {
    const before = await this.load();
    const version = this.version;
    await this.ctx.storage.deleteAll();
    this.site = null;
    const fresh = await this.load();
    this.version = version;
    await this.save(fresh);
    this.broadcast({ type: "ops", ops: diffSite(before, fresh), version: this.version, origin: "demo-reset", summary: "Demo reset" });
    this.broadcast({ type: "comments", threads: [] });
  }
}

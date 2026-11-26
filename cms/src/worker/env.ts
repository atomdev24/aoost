import type { DemoStore } from "./demo-store";
import type { DraftStore } from "./draft-store";

export interface Env {
  ASSETS: Fetcher;
  MEDIA: R2Bucket;
  DRAFT: DurableObjectNamespace<DraftStore>;
  /** The public demo editor's draft (/demo/), apart from the real one. */
  DEMO: DurableObjectNamespace<DemoStore>;
  /** Set (by the worker, per request) while serving the demo editor: everything reads and writes the demo draft. */
  IS_DEMO?: "1";
  /** "password" (EDITOR_PASSWORD) or "access" (Cloudflare Access JWT). */
  AUTH_MODE: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  /** Comma-separated emails that are always owners when signing in with Google (Cloudflare Access). */
  OWNER_EMAILS?: string;
  /** Role for someone signed in who isn't on the team list: viewer (default) or editor. */
  DEFAULT_ROLE?: string;
  GITHUB_REPO: string;
  PUBLISH_BRANCH: string;
  EDITOR_PASSWORD?: string;
  GITHUB_TOKEN?: string;
  /** Microsoft Clarity Data Export token (a Worker secret), for the daily visitor numbers. */
  CLARITY_API_TOKEN?: string;
  /** "1" lets a password-mode or localhost server publish for real (off by default: those are test servers). */
  ALLOW_LOCAL_PUBLISH?: string;
}

/** One draft per site: a single, fixed Durable Object (and one more for the demo editor). */
export const draftStub = (env: Env): DurableObjectStub<DraftStore> =>
  env.IS_DEMO ? (env.DEMO.get(env.DEMO.idFromName("demo")) as unknown as DurableObjectStub<DraftStore>) : env.DRAFT.get(env.DRAFT.idFromName("site"));
export const demoStub = (env: Env) => env.DEMO.get(env.DEMO.idFromName("demo"));
/** The env for a demo request: the demo draft, and nothing that reaches GitHub or publishes. */
export const demoEnv = (env: Env): Env => ({ ...env, IS_DEMO: "1", GITHUB_TOKEN: undefined, ALLOW_LOCAL_PUBLISH: undefined });

/** Read the draft site through RPC. */
export async function readDraft(env: Env): Promise<{ site: import("../schema").Site; version: number }> {
  const { json, version } = await draftStub(env).getSiteJson();
  return { site: JSON.parse(json), version };
}

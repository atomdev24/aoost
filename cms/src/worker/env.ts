import type { DraftStore } from "./draft-store";

export interface Env {
  ASSETS: Fetcher;
  MEDIA: R2Bucket;
  DRAFT: DurableObjectNamespace<DraftStore>;
  /** "password" (EDITOR_PASSWORD) or "access" (Cloudflare Access JWT). */
  AUTH_MODE: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  GITHUB_REPO: string;
  PUBLISH_BRANCH: string;
  EDITOR_PASSWORD?: string;
  GITHUB_TOKEN?: string;
  /** "1" lets a password-mode or localhost server publish for real (off by default: those are test servers). */
  ALLOW_LOCAL_PUBLISH?: string;
}

/** One draft per site: a single, fixed Durable Object. */
export const draftStub = (env: Env) => env.DRAFT.get(env.DRAFT.idFromName("site"));

/** Read the draft site through RPC. */
export async function readDraft(env: Env): Promise<{ site: import("../schema").Site; version: number }> {
  const { json, version } = await draftStub(env).getSiteJson();
  return { site: JSON.parse(json), version };
}

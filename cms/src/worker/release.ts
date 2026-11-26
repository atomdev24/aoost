import { checkSchedule, releaseAction, type Release } from "../model/release";
import { draftStub, type Env } from "./env";
import { cachedVersionFiles, listVersions } from "./history";
import { publishToGitHub } from "./publish";

/**
 * Releases on the server (EDITOR-RELEASES.md): kept with the draft (real or demo), pushed by the
 * 15-minute cron when due, undone at the end time or on request. In the demo, pushing and undoing
 * only pretend, like Publish there.
 */
const KEY = "release";

type Draft = ReturnType<typeof draftStub>;
export const getRelease = async (draft: Draft) => ((await draft.kvGet(KEY)) as Release | null) ?? null;
const putRelease = (draft: Draft, r: Release) => draft.kvPut(KEY, r, 0);

const gh = (env: Env) => ({ repo: env.GITHUB_REPO, branch: env.PUBLISH_BRANCH, token: env.GITHUB_TOKEN! });

/** Schedule what's in staging (or change its times). */
export async function scheduleRelease(env: Env, body: { label?: string; goLiveAt?: unknown; endAt?: unknown } | null, by: string): Promise<Release | string> {
  const draft = draftStub(env);
  const staging = await draft.getStaging();
  if (!staging?.at) return "Send the draft to staging first: a release goes live from there.";
  const times = checkSchedule(body?.goLiveAt, body?.endAt, Date.now());
  if (typeof times === "string") return times;
  const r: Release = { label: (body?.label?.trim() || staging.label || "Release").slice(0, 120), ...times, state: "scheduled", by };
  await putRelease(draft, r);
  return r;
}

export async function cancelRelease(env: Env) {
  const draft = draftStub(env);
  const r = await getRelease(draft);
  if (r && (r.state === "scheduled" || r.state === "blocked")) await putRelease(draft, { ...r, state: "cancelled" });
}

/** Push the staged release live now (the cron, when it's due). */
export async function pushRelease(env: Env): Promise<Release | null> {
  const draft = draftStub(env);
  const r = await getRelease(draft);
  if (!r) return null;
  const block = async (note: string) => {
    const next: Release = { ...r, state: "blocked", note };
    await putRelease(draft, next);
    return next;
  };
  const staged = await draft.getStagedForPush();
  if (!staged) return block("Staging was cleared before it was due, so nothing went live.");
  if (env.IS_DEMO) {
    await draft.markPublished(staged.files);
    await draft.clearStaging();
    const live: Release = { ...r, state: "live", liveAt: Date.now() };
    await putRelease(draft, live);
    return live;
  }
  if (!env.GITHUB_TOKEN) return block("This server can't publish (no GitHub token).");
  const { blocked } = await draft.sync(true);
  if (blocked) return block(blocked);
  if (staged.liveMoved) return block("The live site changed after this was sent to staging. Send it to staging again and schedule it again.");
  const prev = (await listVersions(gh(env), 1).catch(() => []))[0]?.sha;
  const result = await publishToGitHub(staged.files, { ...gh(env), message: `Push to production: ${r.label} (scheduled release)`, by: r.by.includes("@") ? r.by.split("@")[0] : null, base: staged.base });
  if (!result.ok) return block(result.error);
  await draft.markPublished(staged.files);
  await draft.clearStaging();
  const live: Release = { ...r, state: "live", prevSha: prev, liveSha: result.commit ?? undefined, liveAt: Date.now(), note: undefined };
  await putRelease(draft, live);
  return live;
}

/** Put back what was live before the release (its end time, or Undo release). */
export async function undoRelease(env: Env, by: string | null): Promise<Release | string> {
  const draft = draftStub(env);
  const r = await getRelease(draft);
  if (r?.state !== "live") return "No release is live to undo.";
  if (env.IS_DEMO) {
    const ended: Release = { ...r, state: "ended", endedAt: Date.now() };
    await putRelease(draft, ended);
    return ended;
  }
  if (!env.GITHUB_TOKEN || !r.prevSha) return "This release can't be undone here. Restore the version before it from Version history.";
  // Only if nothing newer went live since: undoing would otherwise throw that work away too.
  const head = (await listVersions(gh(env), 1).catch(() => []))[0]?.sha;
  if (r.liveSha && head && head !== r.liveSha) return "Something newer went live after this release. Restore the version you want from Version history instead.";
  const files = await cachedVersionFiles(r.prevSha, gh(env));
  const result = await publishToGitHub(files, { ...gh(env), message: `Restore: undo release ${r.label}`, by });
  if (!result.ok) return result.error;
  await draft.markPublished(files);
  const ended: Release = { ...r, state: "ended", endedAt: Date.now() };
  await putRelease(draft, ended);
  return ended;
}

/** The cron's turn: go live or end, for the real draft and the demo's. */
export async function releaseTick(env: Env, demoEnv: Env) {
  for (const e of [env, demoEnv]) {
    try {
      const r = await getRelease(draftStub(e));
      const act = releaseAction(r, Date.now());
      if (act === "push") await pushRelease(e);
      else if (act === "end") {
        const done = await undoRelease(e, "scheduled end");
        if (typeof done === "string") await draftStub(e).kvPut(KEY, { ...r!, state: "blocked", note: done }, 0);
      }
    } catch (err) {
      console.error("release", err);
    }
  }
}

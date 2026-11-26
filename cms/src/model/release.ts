/**
 * A release: the draft frozen in staging, with a name, a go-live time and an optional end time
 * (EDITOR-RELEASES.md). The server's 15-minute cron pushes it when it's due and, at the end time,
 * puts back what was live before.
 */
export type ReleaseState = "scheduled" | "live" | "blocked" | "ended" | "cancelled";
export type Release = {
  label: string;
  /** When it goes live and (optionally) when it is undone, in ms. */
  goLiveAt: number;
  endAt?: number;
  state: ReleaseState;
  by: string;
  /** Why it didn't go (blocked), in plain words. */
  note?: string;
  /** The commit that was live before it went live (what undo publishes again), and its own commit. */
  prevSha?: string;
  liveSha?: string;
  liveAt?: number;
  endedAt?: number;
};

/** What the cron should do with a release now. */
export function releaseAction(r: Release | null, now: number): "push" | "end" | null {
  if (!r) return null;
  if (r.state === "scheduled" && now >= r.goLiveAt) return "push";
  if (r.state === "live" && r.endAt && now >= r.endAt) return "end";
  return null;
}

/** Check a schedule from the editor: a go-live time a little ahead, and an end after it. */
export function checkSchedule(goLiveAt: unknown, endAt: unknown, now: number): { goLiveAt: number; endAt?: number } | string {
  const g = Number(goLiveAt);
  if (!Number.isFinite(g)) return "Choose when it goes live.";
  if (g < now - 60_000) return "That time has passed. Choose a time from now on.";
  if (g > now + 366 * 86_400_000) return "Choose a time within the next year.";
  if (endAt === undefined || endAt === null || endAt === "") return { goLiveAt: g };
  const e = Number(endAt);
  if (!Number.isFinite(e) || e <= g) return "The end has to come after it goes live.";
  return { goLiveAt: g, endAt: e };
}

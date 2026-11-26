import type { ClarityReply, InsightsDay } from "../model/insights";
import { draftStub, type Env } from "./env";

/**
 * Microsoft Clarity's daily numbers, fetched by the server (the token never reaches a browser)
 * and kept by day with the real draft, because Clarity's API only gives the last 1–3 days and
 * allows 10 requests a day. Two requests per fetch: by page and by device.
 */
const API = "https://www.clarity.ms/export-data/api/v1/project-live-insights";
const DAYS = "insights:days";
const LAST = "insights:last";
const KEEP_DAYS = 120;
/** A manual "Fetch now" at most every 3 hours (the cron fetches once a day). */
export const MANUAL_GAP_MS = 3 * 3600_000;

const real = (env: Env) => draftStub({ ...env, IS_DEMO: undefined });
const dayKey = (date: string) => `insights:day:${date}`;

async function ask(token: string, dimension: string): Promise<ClarityReply | string> {
  const res = await fetch(`${API}?numOfDays=1&dimension1=${encodeURIComponent(dimension)}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  if (res.status === 401 || res.status === 403) return "Clarity didn't accept the token. Make a new one in Clarity (Settings → Data Export) and replace CLARITY_API_TOKEN.";
  if (res.status === 429) return "Clarity's limit of 10 requests a day is used up. The numbers will come in tomorrow.";
  if (!res.ok) return `Clarity answered ${res.status}.`;
  const body = (await res.json().catch(() => null)) as unknown;
  return Array.isArray(body) ? (body as ClarityReply) : "Clarity sent something unexpected.";
}

const PROJECT = "insights:project";
export type InsightsState = { project: string | null; token: boolean; last: { at: number; error?: string } | null; days: InsightsDay[] };

/** The Clarity project's ID, kept with the real draft too so the demo can link into it. */
export async function setInsightsProject(env: Env, project: unknown) {
  const id = typeof project === "string" && /^[a-z0-9]{6,20}$/.test(project) ? project : null;
  if (id) await real(env).kvPut(PROJECT, id, 0);
  else await real(env).kvDelete(PROJECT);
  return id;
}

/** Fetch yesterday's numbers (the last 24 hours) and keep them. Returns an error message, or null. */
export async function fetchInsights(env: Env, opts: { manual?: boolean } = {}): Promise<string | null> {
  const token = env.CLARITY_API_TOKEN;
  if (!token) return "The Clarity token isn't set yet (CLARITY_API_TOKEN).";
  const draft = real(env);
  const last = ((await draft.kvGet(LAST)) as { at: number; error?: string } | null) ?? null;
  if (opts.manual && last && Date.now() - last.at < MANUAL_GAP_MS) return "Fetched less than 3 hours ago. Clarity allows only a few requests a day, so try again later.";
  const [url, device] = await Promise.all([ask(token, "URL"), ask(token, "Device")]);
  const error = typeof url === "string" ? url : typeof device === "string" ? device : undefined;
  await draft.kvPut(LAST, error ? { at: Date.now(), error } : { at: Date.now() }, 0);
  if (typeof url === "string" && typeof device === "string") return error ?? null;
  // The last 24 hours, filed under the day they mostly cover.
  const date = new Date(Date.now() - 12 * 3600_000).toISOString().slice(0, 10);
  const day: InsightsDay = { date, at: Date.now(), url: typeof url === "string" ? null : url, device: typeof device === "string" ? null : device };
  await draft.kvPut(dayKey(date), day, 0);
  const dates = new Set(((await draft.kvGet(DAYS)) as string[] | null) ?? []);
  dates.add(date);
  const sorted = [...dates].sort();
  for (const old of sorted.slice(0, Math.max(0, sorted.length - KEEP_DAYS))) await draft.kvDelete(dayKey(old));
  await draft.kvPut(DAYS, sorted.slice(-KEEP_DAYS), 0);
  return error ?? null;
}

/** What the insights view shows: the last `n` days. The demo reads the real site's numbers. */
export async function getInsights(env: Env, n = 30): Promise<InsightsState> {
  const draft = real(env);
  const dates = (((await draft.kvGet(DAYS)) as string[] | null) ?? []).slice(-Math.max(1, Math.min(n, KEEP_DAYS)));
  const days = (await Promise.all(dates.map(async (d) => (await draft.kvGet(dayKey(d))) as InsightsDay | null))).filter((d): d is InsightsDay => !!d);
  return { project: ((await draft.kvGet(PROJECT)) as string | null) ?? null, token: !!env.CLARITY_API_TOKEN, last: ((await draft.kvGet(LAST)) as { at: number; error?: string } | null) ?? null, days };
}

/**
 * Visitor insights from Microsoft Clarity's Data Export API, kept by day (worker/insights.ts) and
 * summed per page here. Clarity documents only the Traffic fields, so every other field is read
 * defensively: a missing field is simply not shown.
 */

export type ClarityReply = { metricName?: string; information?: Record<string, unknown>[] }[];
/** One day as stored: when it was fetched, and Clarity's replies broken down by URL and by device. */
export type InsightsDay = { date: string; at: number; url: ClarityReply | null; device: ClarityReply | null };

export type PageInsights = {
  path: string;
  sessions: number;
  /** Average of the days' average scroll depth, in %. */
  scroll: number | null;
  /** Average active time on the page per session, in seconds. */
  activeTime: number | null;
  rageClicks: number;
  deadClicks: number;
  quickBacks: number;
  /** Sessions per day, oldest first, for a small trend line. */
  trend: number[];
};

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const first = (row: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const n = num(row[k]);
    if (n !== null) return n;
  }
  return null;
};

/** "https://alexoostendurp.com/work?x=1#top" → "/work". */
export function pathOf(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  try {
    const p = new URL(url, "https://x.invalid").pathname.replace(/\/+$/, "");
    return p || "/";
  } catch {
    return null;
  }
}

const CLICKS: Record<string, "rageClicks" | "deadClicks" | "quickBacks"> = {
  "Rage Click Count": "rageClicks",
  "Dead Click Count": "deadClicks",
  "Quickback Click": "quickBacks",
};

type Acc = { sessions: number; scroll: number[]; active: number[]; rageClicks: number; deadClicks: number; quickBacks: number; perDay: Map<string, number> };

/** Every page's numbers over the stored days, busiest first. */
export function summarise(days: InsightsDay[]): PageInsights[] {
  const pages = new Map<string, Acc>();
  const acc = (path: string) => {
    let a = pages.get(path);
    if (!a) pages.set(path, (a = { sessions: 0, scroll: [], active: [], rageClicks: 0, deadClicks: 0, quickBacks: 0, perDay: new Map() }));
    return a;
  };
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of sorted) {
    for (const block of day.url ?? []) {
      for (const row of block.information ?? []) {
        const path = pathOf(row.URL ?? row.Url ?? row.url);
        if (!path) continue;
        const a = acc(path);
        if (block.metricName === "Traffic") {
          const s = first(row, ["totalSessionCount", "sessionsCount"]) ?? 0;
          a.sessions += s;
          a.perDay.set(day.date, (a.perDay.get(day.date) ?? 0) + s);
        } else if (block.metricName === "Scroll Depth") {
          const v = first(row, ["averageScrollDepth", "scrollDepth", "average"]);
          if (v !== null) a.scroll.push(v);
        } else if (block.metricName === "Engagement Time") {
          const v = first(row, ["activeTime", "totalTime"]);
          if (v !== null) a.active.push(v);
        } else if (block.metricName && CLICKS[block.metricName]) {
          a[CLICKS[block.metricName]!] += first(row, ["subTotal", "sessionsCount"]) ?? 0;
        }
      }
    }
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return [...pages.entries()]
    .map(([path, a]) => ({
      path,
      sessions: a.sessions,
      scroll: avg(a.scroll),
      activeTime: avg(a.active),
      rageClicks: a.rageClicks,
      deadClicks: a.deadClicks,
      quickBacks: a.quickBacks,
      trend: sorted.map((d) => a.perDay.get(d.date) ?? 0),
    }))
    .sort((x, y) => y.sessions - x.sessions || x.path.localeCompare(y.path));
}

/** Sessions by device type over the stored days (Mobile, PC, Tablet…). */
export function devices(days: InsightsDay[]): { device: string; sessions: number }[] {
  const m = new Map<string, number>();
  for (const day of days)
    for (const block of day.device ?? [])
      if (block.metricName === "Traffic")
        for (const row of block.information ?? []) {
          const d = typeof row.Device === "string" ? row.Device : "Other";
          m.set(d, (m.get(d) ?? 0) + (first(row, ["totalSessionCount"]) ?? 0));
        }
  return [...m.entries()].map(([device, sessions]) => ({ device, sessions })).sort((a, b) => b.sessions - a.sessions);
}

/** Accepts a Clarity project ID or a link to the project ("…/projects/view/zju5sls37v/…"). */
export function clarityIdFrom(input: string): string | null {
  const s = input.trim();
  const m = /projects\/view\/([a-z0-9]{6,20})/i.exec(s) ?? /^([a-z0-9]{6,20})$/i.exec(s);
  return m ? m[1]!.toLowerCase() : null;
}

/** Links into Clarity for one page: its heatmap and its recordings. */
export const clarityLinks = (project: string, pageUrl: string) => ({
  heatmap: `https://clarity.microsoft.com/projects/view/${project}/heatmaps?url=${encodeURIComponent(pageUrl)}`,
  recordings: `https://clarity.microsoft.com/projects/view/${project}/impressions?URL=${encodeURIComponent(`1;1;${pageUrl}`)}`,
  dashboard: `https://clarity.microsoft.com/projects/view/${project}/dashboard`,
});

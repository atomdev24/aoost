import { z } from "zod";

/**
 * The editor's problem log: what went wrong while someone was editing (errors, failed saves or
 * requests, lost live connection, long freezes) and problems people report themselves. Kept in
 * the draft store, newest last, so Alex (or Claude, through the connector) can pull it when
 * something misbehaves.
 */
export const PROBLEM_KINDS = ["error", "request", "connection", "stall", "publish", "report"] as const;
export type ProblemKind = (typeof PROBLEM_KINDS)[number];

export const Problem = z.object({
  /** When it happened (ms since epoch, from the browser). */
  t: z.number().int().positive(),
  kind: z.enum(PROBLEM_KINDS),
  /** One line: what happened. */
  message: z.string().min(1).max(500),
  /** Anything that helps pin it down (stack, URL and status, duration). */
  detail: z.string().max(4000).optional(),
  /** Where the editor was: page, screen size, zoom, selection, browser, window size, build. */
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type Problem = z.infer<typeof Problem>;
/** As stored: who sent it (their login) is added by the server. */
export type StoredProblem = Problem & { who: string };

export const MAX_STORED = 400;
export const MAX_BATCH = 50;

/** Accept a batch from the editor: valid entries only, at most MAX_BATCH. */
export function cleanProblems(input: unknown): Problem[] {
  if (!Array.isArray(input)) return [];
  const out: Problem[] = [];
  for (const raw of input.slice(0, MAX_BATCH)) {
    const r = Problem.safeParse(raw);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** Add new entries to the stored log, oldest dropped past the limit. */
export function appendProblems(stored: StoredProblem[], add: Problem[], who: string, max = MAX_STORED): StoredProblem[] {
  const next = [...stored, ...add.map((p) => ({ ...p, who }))];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** A plain-text report of the log, newest first, for copying into a message or a chat with Claude. */
export function problemsReport(items: StoredProblem[], limit = 100): string {
  if (!items.length) return "No problems recorded.";
  return items
    .slice(-limit)
    .reverse()
    .map((p) => {
      const when = new Date(p.t).toISOString().replace("T", " ").slice(0, 19);
      const ctx = p.context ? Object.entries(p.context).map(([k, v]) => `${k}=${v}`).join(" · ") : "";
      return [`${when} UTC · ${p.kind} · ${p.who}`, `  ${p.message}`, ctx && `  ${ctx}`, p.detail && `  ${p.detail.split("\n").slice(0, 6).join("\n  ")}`].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

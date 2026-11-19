/**
 * Simple fuzzy matching for the palette. Every query character must appear in
 * order. Higher is better: an exact match beats a prefix, a prefix beats a word
 * start, a word start beats letters scattered through the text, and among
 * those, tighter and earlier matches win. Null means no match.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 0;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 900 - Math.min(100, t.length - q.length);
  const word = t.search(new RegExp(`(^|[\\s/·:(-])${escape(q)}`));
  if (word >= 0) return 800 - Math.min(100, word);
  const inside = t.indexOf(q);
  if (inside >= 0) return 650 - Math.min(100, inside);
  // Letters in order, with gaps. Matches at word starts count extra.
  let score = 400;
  let at = -1;
  let prev = -2;
  for (const ch of q) {
    if (ch === " ") continue;
    const i = t.indexOf(ch, at + 1);
    if (i < 0) return null;
    const startOfWord = i === 0 || /[\s/·:(-]/.test(t[i - 1]!);
    if (startOfWord) score += 12;
    if (i === prev + 1) score += 6;
    else score -= Math.min(15, i - at);
    prev = i;
    at = i;
  }
  return Math.max(1, score);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Rank items by their best-matching text, best first. Items that don't match are left out. Ties keep their order. */
export function rank<T>(items: T[], query: string, texts: (item: T) => string[]): { item: T; score: number }[] {
  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    let best: number | null = null;
    texts(item).forEach((t, k) => {
      const s = fuzzyScore(query, t);
      // The first text is the title; keywords count a little less.
      const v = s === null ? null : k === 0 ? s : s - 50;
      if (v !== null && (best === null || v > best)) best = v;
    });
    if (best !== null) scored.push({ item, score: best, i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map(({ item, score }) => ({ item, score }));
}

/** A match this good means the query names something. */
export const STRONG = 640;

/**
 * Does the query read like a request for Claude rather than a search? Yes when
 * it is several words (three or more), or when nothing matches it well.
 */
export function looksLikeSentence(query: string, bestScore: number | null): boolean {
  const q = query.trim();
  if (q.length < 2) return false;
  const words = q.split(/\s+/).length;
  if (words >= 3) return true;
  return bestScore === null || bestScore < STRONG;
}

export type BandPos = "only" | "first" | "mid" | "last";

/**
 * Positions in runs of neighbouring blocks on the same mat, skipping blocks that are switched off
 * (the live page hides those, so their neighbours join). `null` for blocks outside a run.
 */
export function bandPositions(mats: (string | null | "off")[]): (BandPos | null)[] {
  const out: (BandPos | null)[] = mats.map(() => null);
  let run: number[] = [];
  let mat: string | null = null;
  const flush = () => {
    run.forEach((i, k) => (out[i] = run.length === 1 ? "only" : k === 0 ? "first" : k === run.length - 1 ? "last" : "mid"));
    run = [];
  };
  mats.forEach((m, i) => {
    if (m === "off") return;
    if (m && m === mat) run.push(i);
    else {
      flush();
      mat = m;
      if (m) run.push(i);
    }
  });
  flush();
  return out;
}


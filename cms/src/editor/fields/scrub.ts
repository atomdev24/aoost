/** The size of one scrub step: Shift ×10, Alt ×0.1 where decimals make sense. */
export function scrubUnit(step: number, e: { shiftKey: boolean; altKey: boolean }): number {
  if (e.shiftKey) return step * 10;
  if (e.altKey && step < 1) return step / 10;
  if (e.altKey) return 0.1;
  return step;
}

/** Pixels of pointer travel per step. */
export const PX_PER_STEP = 3;

/** The phone inspector card's resting sizes. */
export type CardSize = "collapsed" | "half" | "full";

/** Collapsed shows just the title row (px). */
export const CARD_COLLAPSED = 64;

/** Where a dragged card settles: the resting size nearest the height it was let go at, in a space `room` px tall. */
export function nearestCardSize(height: number, room: number): CardSize {
  const stops: [CardSize, number][] = [
    ["collapsed", CARD_COLLAPSED],
    ["half", room * 0.45],
    ["full", room - 80],
  ];
  return stops.reduce((best, s) => (Math.abs(s[1] - height) < Math.abs(best[1] - height) ? s : best))[0];
}

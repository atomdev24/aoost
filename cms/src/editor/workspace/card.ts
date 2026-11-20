/** The phone inspector card's resting sizes: just the title row, about a third of the screen, nearly full. */
export type CardSize = "collapsed" | "short" | "full";

/** Collapsed shows just the title row (px). */
export const CARD_COLLAPSED = 64;
/** Short is about a third of the room: enough for the first Content fields, with the page still in view. */
export const CARD_SHORT = 0.34;

/** Where a dragged card settles: the resting size nearest the height it was let go at, in a space `room` px tall. */
export function nearestCardSize(height: number, room: number): CardSize {
  const stops: [CardSize, number][] = [
    ["collapsed", CARD_COLLAPSED],
    ["short", room * CARD_SHORT],
    ["full", room - 80],
  ];
  return stops.reduce((best, s) => (Math.abs(s[1] - height) < Math.abs(best[1] - height) ? s : best))[0];
}

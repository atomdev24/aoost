import { describe, expect, it } from "vitest";
import { _test } from "./phantoms.js";

const { plan, reach, ease, RATES } = _test;

describe("simulated visitors", () => {
  it("eases like a hand: starts and ends still, halfway at the middle", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5, 5);
    expect(ease(0.1)).toBeLessThan(0.1);
  });

  it("takes longer for longer reaches, but not in proportion", () => {
    const short = (reach(40) + reach(40) + reach(40)) / 3;
    const long = (reach(800) + reach(800) + reach(800)) / 3;
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThan(short * 4);
  });

  it("turns steps into timed moves and rests that end where they were sent", () => {
    for (let n = 0; n < 20; n++) {
      const segs = plan({ x: 0, y: 0 }, [["move", { x: 600, y: 300 }, 0], ["rest", 1.5], ["move", { x: 620, y: 310 }, 0.4]]) as {
        kind: string;
        dur: number;
        to?: { x: number; y: number };
      }[];
      expect(segs.every((s) => s.dur > 0)).toBe(true);
      const moves = segs.filter((s) => s.kind === "move");
      expect(moves.at(-1)!.to).toEqual({ x: 620, y: 310 });
      // a long reach may overshoot and correct: then the correction lands on the target
      const firstRest = segs.findIndex((s) => s.kind === "rest");
      expect(segs[firstRest - 1]!.to).toEqual({ x: 600, y: 300 });
    }
  });

  it("not every visit gets one, except when asked to show them", () => {
    expect(RATES.rare!.chance).toBeLessThan(RATES.often!.chance);
    expect(RATES.demo!.chance).toBe(1);
  });
});

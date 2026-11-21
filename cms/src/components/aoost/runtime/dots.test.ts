import { describe, expect, it } from "vitest";
import { balanceLine, EFFECTS, IDLE, sentenceCase, wrapLine } from "./dots.js";

describe("dot board", () => {
  it("idle animations stay between a grid dot and a full square, and move over time", () => {
    for (const [name, fx] of Object.entries(IDLE)) {
      let lit = 0, changed = 0;
      for (let y = 0; y < 30; y++) for (let x = 0; x < 200; x++) {
        const a = fx.level(x, y, 1, 200, 30), b = fx.level(x, y, 3.7, 200, 30);
        expect(a, name).toBeGreaterThanOrEqual(0);
        expect(a, name).toBeLessThanOrEqual(1);
        if (a > 0.1) lit++;
        if (Math.abs(a - b) > 0.05) changed++;
      }
      expect(lit, name).toBeGreaterThan(100);
      expect(changed, name).toBeGreaterThan(500);
    }
  });

  it("shows lines in sentence case, leaving the rest as written", () => {
    expect(sentenceCase("welcome")).toBe("Welcome");
    expect(sentenceCase("beat the game, top score 9749 by J WARELEY")).toBe("Beat the game, top score 9749 by J WARELEY");
    expect(sentenceCase("  pick a playlist")).toBe("  Pick a playlist");
    expect(sentenceCase("")).toBe("");
  });

  it("splits a long line at word breaks into frames that fit", () => {
    const fits = (s: string) => s.length <= 12;
    expect(wrapLine("beat the game, be the first on the board".split(" "), fits)).toEqual(["beat the", "game, be the", "first on the", "board"]);
    expect(wrapLine(["welcome"], fits)).toEqual(["welcome"]);
    // A single word longer than a frame still gets its own frame (drawn a little smaller).
    expect(wrapLine(["extraordinarily", "so"], fits)).toEqual(["extraordinarily", "so"]);
  });

  it("shares the words of a long line out evenly between its frames", () => {
    const words = "beat the game, top score 9749 by J WARELEY".split(" ");
    const frames = balanceLine(words, (s: string) => s.length, 34);
    expect(frames).toHaveLength(2);
    expect(Math.abs(frames[0]!.length - frames[1]!.length)).toBeLessThanOrEqual(6);
  });

  it("breathe: dots grow in, hold, and shrink away", () => {
    const fx = EFFECTS.breathe as { size: (c: { x: number; din: number; dout: number }, t: number, T: { total: number; inEnd: number; outStart: number }) => number };
    const T = { total: 4, inEnd: 1.2, outStart: 3.15 };
    const cell = { x: 10, din: 0.2, dout: 0.1 };
    expect(fx.size(cell, 0.1, T)).toBe(0);
    expect(fx.size(cell, 0.45, T)).toBeGreaterThan(0.5);
    expect(Math.abs(fx.size(cell, 2, T) - 1)).toBeLessThan(0.05);
    expect(fx.size(cell, 3.2, T)).toBe(1);
    expect(fx.size(cell, 3.9, T)).toBe(0);
  });
});

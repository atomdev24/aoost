import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS runtime module
import { createSky, SKY, skyPhase } from "./sky.js";
import { IDLE } from "./dots.js";

const COLS = 300, ROWS = 30;
/** Run a board from 0 to `until` seconds at 60 frames a second, returning each frame's brightest cell and lit-cell count. */
function run(until: number, opts = {}) {
  const sky = createSky(opts), out: { t: number; max: number; lit: number }[] = [];
  for (let f = 0; f <= until * 60; f++) {
    const t = f / 60, L = sky.levels(t, COLS, ROWS, 0.5);
    let max = 0, lit = 0;
    for (const v of L) { if (v > max) max = v; if (v > 0.03) lit++; }
    out.push({ t, max, lit });
  }
  return out;
}

/** Bright moments more than a second apart: one per shooting star (its head flickers a little as it crosses cells). */
function countPasses(frames: { t: number; max: number }[]) {
  let passes = 0, lastBright = -9;
  for (const f of frames) if (f.max > 0.9) { if (f.t - lastBright > 1) passes++; lastBright = f.t; }
  return passes;
}

describe("night sky idle animation", () => {
  it("goes wave → hand-over → sky → back, then round again", () => {
    expect(skyPhase(1).part).toBe("wave");
    expect(skyPhase(SKY.wave + 0.5).part).toBe("handover");
    expect(skyPhase(SKY.wave + SKY.handover + 2).part).toBe("sky");
    const period = SKY.wave + SKY.handover + SKY.sky + SKY.back;
    expect(skyPhase(period - 0.5).part).toBe("back");
    expect(skyPhase(period + 1)).toMatchObject({ part: "wave", round: 1 });
  });

  it("starts as the board's own wave", () => {
    const L = createSky().levels(3, COLS, ROWS, 0.5);
    for (const [x, y] of [[10, 5], [150, 15], [290, 25]] as const) expect(L[y * COLS + x]).toBeCloseTo(IDLE.wave!.level(x, y, 1.5, COLS, ROWS), 5);
  });

  it("in the sky, only faint stars and a few bright shooting stars", () => {
    const frames = run(SKY.wave + SKY.handover + SKY.sky).filter((f) => f.t > SKY.wave + SKY.handover + 0.2);
    // most of the time the sky is faint: stars only, nothing like the wave
    const quiet = frames.filter((f) => f.max < 0.55);
    expect(quiet.length / frames.length).toBeGreaterThan(0.7);
    expect(Math.min(...quiet.map((f) => f.lit))).toBeGreaterThan(5);
    // shooting stars: bright, and three separate passes
    const passes = countPasses(frames);
    expect(passes).toBe(3);
  });

  it("can show fewer shooting stars", () => {
    const frames = run(SKY.wave + SKY.handover + SKY.sky, { stars: 1 }).filter((f) => f.t > SKY.wave + SKY.handover + 0.2);
    const passes = countPasses(frames);
    expect(passes).toBe(1);
  });
});

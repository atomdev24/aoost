import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS runtime module
import { centreRange, clamp, rubber, turnedHalf } from "./bounds.js";

describe("projects table bounds", () => {
  it("measures a turned box", () => {
    expect(turnedHalf(200, 100, 0)).toEqual({ hx: 100, hy: 50 });
    const r = turnedHalf(200, 100, 90);
    expect(r.hx).toBeCloseTo(50);
    expect(r.hy).toBeCloseTo(100);
    expect(turnedHalf(200, 100, 10).hx).toBeGreaterThan(100); // a tilt makes it wider
  });
  it("gives resistance past an edge but never more than the give", () => {
    expect(rubber(50, 0, 100)).toBe(50);
    expect(rubber(120, 0, 100)).toBeGreaterThan(100);
    expect(rubber(120, 0, 100)).toBeLessThan(120);
    expect(rubber(5000, 0, 100, 70)).toBeLessThan(170);
    expect(rubber(-5000, 0, 100, 70)).toBeGreaterThan(-70);
  });
  it("snaps back to the nearest fully visible spot", () => {
    const r = centreRange(1000, 600, 120, 80, 6);
    expect(clamp(1100, r.x0, r.x1)).toBe(1000 - 120 - 6);
    expect(clamp(-40, r.y0, r.y1)).toBe(86);
    expect(clamp(500, r.x0, r.x1)).toBe(500);
    expect(clamp(10, 300, 200)).toBe(250); // bigger than the table: centred
  });
});

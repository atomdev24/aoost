import { describe, expect, it } from "vitest";
import { edgeOffset } from "./liquid";

describe("liquid glass edge map", () => {
  const W = 200, H = 60, R = 30, BAND = 10;
  it("leaves the middle still", () => {
    expect(edgeOffset(100, 30, W, H, R, BAND)).toEqual([0, 0]);
  });
  it("pushes inwards at each edge", () => {
    expect(edgeOffset(100, 0.5, W, H, R, BAND)[1]).toBeGreaterThan(0.8); // top: down
    expect(edgeOffset(100, H - 0.5, W, H, R, BAND)[1]).toBeLessThan(-0.8); // bottom: up
    const left = edgeOffset(0.5, 30, W, H, R, BAND);
    const right = edgeOffset(W - 0.5, 30, W, H, R, BAND);
    expect(left[0]).toBeGreaterThan(0.8);
    expect(right[0]).toBeLessThan(-0.8);
  });
  it("is symmetric and stays within -1..1", () => {
    const a = edgeOffset(12, 9, W, H, R, BAND);
    const b = edgeOffset(W - 12, H - 9, W, H, R, BAND);
    expect(a[0]).toBeCloseTo(-b[0]);
    expect(a[1]).toBeCloseTo(-b[1]);
    for (let x = 0; x <= W; x += 7) for (let y = 0; y <= H; y += 3) {
      const [dx, dy] = edgeOffset(x, y, W, H, R, BAND);
      expect(Math.abs(dx)).toBeLessThanOrEqual(1);
      expect(Math.abs(dy)).toBeLessThanOrEqual(1);
    }
  });
  it("fades out with depth", () => {
    expect(edgeOffset(100, 2, W, H, R, BAND)[1]).toBeGreaterThan(edgeOffset(100, 6, W, H, R, BAND)[1]);
    expect(edgeOffset(100, 11, W, H, R, BAND)).toEqual([0, 0]);
  });
});

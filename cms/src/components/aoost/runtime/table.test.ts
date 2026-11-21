import { describe, expect, it } from "vitest";
import { clearLayout, pieceTransform, layoutTable, overlapping, separate } from "./table.js";

const onTable = (p: { x: number; y: number; w: number; h: number }, W: number, H: number) => p.x + p.w / 2 > 0 && p.x + p.w / 2 < W && p.y + p.h / 2 > 0 && p.y + p.h / 2 < H;
const anyOverlap = (items: Parameters<typeof overlapping>[0][]) => items.some((a, i) => items.some((b, j) => j > i && overlapping(a, b, 2)));

describe("projects table", () => {
  it("divides a piece's scale out of its translate, so a resized piece sits (and drags) exactly where it's put", () => {
    expect(pieceTransform(100, 50, 3)).toBe("translate(100px,50px) rotate(3deg)");
    expect(pieceTransform(110, 55, -2, 0.55)).toBe("translate(200px,100px) rotate(-2deg)");
    // centre on screen = origin + scale × translate, so it lands on x for any scale
    for (const s of [0.4, 0.66, 1, 1.8]) {
      const tx = Number(/translate\(([-\d.]+)px/.exec(pieceTransform(300, 0, 0, s))![1]);
      expect(s * tx).toBeCloseTo(300, 1);
    }
  });

  it("lays pieces out the same way every time for the same width", () => {
    const a = layoutTable(1040, [1.25, 0.8, 1.4, 1, 1.3]);
    const b = layoutTable(1040, [1.25, 0.8, 1.4, 1, 1.3]);
    expect(a).toEqual(b);
    expect(a.pw).toBeCloseTo(218.4, 1); // 4 columns of 260px
    expect(a.items).toHaveLength(5);
  });

  for (const [W, n] of [[1040, 5], [1040, 9], [358, 5], [358, 8], [700, 12]] as const) {
    it(`first layout leaves no piece on another (${n} pieces, ${W}px)`, () => {
      const aspects = Array.from({ length: n }, (_, i) => [1.25, 0.75, 1.5, 1, 1.35][i % 5]!);
      const { H, items } = clearLayout(W, aspects);
      expect(anyOverlap(items)).toBe(false);
      for (const p of items) expect(onTable(p, W, H)).toBe(true);
    });
  }

  it("a dropped piece stays put and the one it landed on moves out of the way", () => {
    const W = 1040, H = 640;
    const a = { x: 100, y: 100, rot: 0, w: 200, h: 250 };
    const b = { x: 160, y: 140, rot: 4, w: 200, h: 250 }; // dropped onto a
    const [na, nb] = separate([a, b], W, H, { pinned: 1 });
    expect(nb!.x).toBeCloseTo(160);
    expect(nb!.y).toBeCloseTo(140);
    expect(na!.moved).toBe(true);
    expect(overlapping(na!, nb!, 0)).toBe(false);
  });

  it("bigger pieces (scaled up on this screen) are kept apart by their scaled size", () => {
    const { items } = clearLayout(1040, [1.25, 1.25, 1.25, 1.25, 1.25], [1.6, 1, 1, 1, 1]);
    expect(anyOverlap(items)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { FLYOUT_W, RAIL_HOME, RAIL_W, railLayout } from "./rail-store";

describe("the movable rail", () => {
  const W = 1512, H = 900, railH = 330;
  it("sits at home by default, flyout to its right, covering the left edge", () => {
    expect(railLayout(null, W, H, railH)).toEqual({ x: RAIL_HOME.x, y: RAIL_HOME.y, flyoutX: RAIL_HOME.x + RAIL_W + 6, flyoutY: RAIL_HOME.y, side: "left" });
  });
  it("floats anywhere on the canvas, flyout still to its right when there's room", () => {
    const l = railLayout({ x: 600, y: 200 }, W, H, railH);
    expect(l).toMatchObject({ x: 600, y: 200, flyoutX: 600 + RAIL_W + 6, side: "none" });
  });
  it("opens the flyout to its left near the right edge, and snaps to that edge", () => {
    const near = railLayout({ x: W - 200, y: 100 }, W, H, railH);
    expect(near.flyoutX).toBe(W - 200 - 6 - FLYOUT_W);
    const snapped = railLayout({ x: W - RAIL_W - 20, y: 100 }, W, H, railH);
    expect(snapped).toMatchObject({ x: W - RAIL_W - RAIL_HOME.x, side: "right" });
  });
  it("snaps back to the left edge and never leaves the window", () => {
    expect(railLayout({ x: 20, y: 300 }, W, H, railH).x).toBe(RAIL_HOME.x);
    const off = railLayout({ x: -500, y: 5000 }, W, H, railH);
    expect(off.x).toBe(RAIL_HOME.x);
    expect(off.y).toBe(H - railH - 8);
    expect(railLayout({ x: 9999, y: -40 }, W, H, railH)).toMatchObject({ x: W - RAIL_W - RAIL_HOME.x, y: 8 });
  });
});

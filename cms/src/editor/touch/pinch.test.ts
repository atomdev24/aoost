import { describe, expect, it } from "vitest";
import { pinchOf } from "./pinch";

describe("pinch", () => {
  it("gives the midpoint and spread of two fingers", () => {
    expect(pinchOf({ x: 0, y: 0 }, { x: 30, y: 40 })).toEqual({ mid: { x: 15, y: 20 }, dist: 50 });
  });
  it("never divides by zero", () => {
    expect(pinchOf({ x: 5, y: 5 }, { x: 5, y: 5 }).dist).toBe(1);
  });
});

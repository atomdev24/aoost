import { describe, expect, it } from "vitest";
import { PX_PER_STEP, scrubUnit } from "./scrub";

describe("scrubbing", () => {
  it("moves one step per ~3px, Shift ×10, Alt ×0.1 for decimal fields", () => {
    expect(PX_PER_STEP).toBe(3);
    expect(scrubUnit(1, { shiftKey: false, altKey: false })).toBe(1);
    expect(scrubUnit(1, { shiftKey: true, altKey: false })).toBe(10);
    expect(scrubUnit(0.01, { shiftKey: false, altKey: true })).toBeCloseTo(0.001);
  });
});

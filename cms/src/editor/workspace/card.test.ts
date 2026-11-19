import { describe, expect, it } from "vitest";
import { CARD_COLLAPSED, CARD_SHORT, nearestCardSize } from "./card";

describe("phone inspector card", () => {
  it("has three resting sizes: title row, about a third, nearly full", () => {
    expect(CARD_COLLAPSED).toBe(64);
    expect(CARD_SHORT).toBeCloseTo(1 / 3, 1);
  });
  it("settles at the nearest resting size", () => {
    expect(nearestCardSize(40, 800)).toBe("collapsed");
    expect(nearestCardSize(150, 800)).toBe("collapsed");
    expect(nearestCardSize(270, 800)).toBe("short");
    expect(nearestCardSize(400, 800)).toBe("short");
    expect(nearestCardSize(560, 800)).toBe("full");
    expect(nearestCardSize(700, 800)).toBe("full");
  });
});

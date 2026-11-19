import { describe, expect, it } from "vitest";
import { nearestCardSize } from "./card";

describe("phone inspector card", () => {
  it("settles at the nearest resting size", () => {
    expect(nearestCardSize(40, 800)).toBe("collapsed");
    expect(nearestCardSize(330, 800)).toBe("half");
    expect(nearestCardSize(700, 800)).toBe("full");
  });
});

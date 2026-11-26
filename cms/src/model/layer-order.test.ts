import { describe, expect, it } from "vitest";
import { arrayDeltaForUp, arrayIndexForDrop, displayChildren } from "./layer-order";

describe("layers panel order", () => {
  const canvas = { kind: "canvas" as const, children: ["back", "middle", "front"] };
  const flow = { kind: "flow" as const, children: ["first", "second", "third"] };

  it("lists the topmost layer first in a free layout, and page order in a flow", () => {
    expect(displayChildren(canvas)).toEqual(["front", "middle", "back"]);
    expect(displayChildren(flow)).toEqual(["first", "second", "third"]);
  });

  it("turns a drop position in the panel into the array index", () => {
    // Dropping at the very top of a free layout puts the layer in front (last in the array).
    expect(arrayIndexForDrop(canvas, 0, 2)).toBe(2);
    expect(arrayIndexForDrop(canvas, 2, 2)).toBe(0);
    expect(arrayIndexForDrop(flow, 0, 2)).toBe(0);
    expect(arrayIndexForDrop(flow, 9, 2)).toBe(2);
  });

  it("moving up in the panel brings a free-layout layer forward", () => {
    expect(arrayDeltaForUp(canvas)).toBe(1);
    expect(arrayDeltaForUp(flow)).toBe(-1);
  });
});

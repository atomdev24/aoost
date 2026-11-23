import { describe, expect, it } from "vitest";
import type { Node } from "../schema";
import { isEdgeToEdge, setEdgeToEdge } from "./edge";

const img: Node = { id: "n1", type: "Image", content: {}, style: { base: { aspectRatio: "16/9", radius: [12, 12, 12, 12], maxWidth: "800px" }, desktop: { width: "80%", radius: [12, 12, 12, 12] } } };

describe("edge to edge", () => {
  it("stretches a block to the screen on every size and drops its corners", () => {
    const on = setEdgeToEdge(img, true);
    expect(isEdgeToEdge(on)).toBe(true);
    expect(on.style.base).toEqual({ aspectRatio: "16/9", width: "100vw", margin: "0 calc(50% - 50vw)" });
    expect(on.style.desktop).toBeUndefined();
  });
  it("turns off again", () => {
    const off = setEdgeToEdge(setEdgeToEdge(img, true), false);
    expect(isEdgeToEdge(off)).toBe(false);
    expect(off.style.base).toEqual({ aspectRatio: "16/9" });
  });
});

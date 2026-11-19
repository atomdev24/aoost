import { describe, expect, it } from "vitest";
import { cleanRefs, placeRef } from "./refs";

describe("board references", () => {
  it("keeps valid items, drops malformed ones and duplicates", () => {
    const ok = { id: "a", src: "/media/2026/x.png", x: 10, y: -20, w: 300, h: 200 };
    const out = cleanRefs([ok, { ...ok }, { id: "b", src: "javascript:alert(1)", x: 0, y: 0, w: 10, h: 10 }, { id: "c", src: "https://e.com/y.jpg", x: 0, y: 0, w: 1, h: 10 }, "nope", { id: "d", src: "https://e.com/z.jpg", x: 0, y: 0, w: 50, h: 50 }]);
    expect(out.map((r) => r.id)).toEqual(["a", "d"]);
  });
  it("accepts nothing that isn't a list", () => {
    expect(cleanRefs({ items: [] })).toEqual([]);
    expect(cleanRefs(null)).toEqual([]);
  });
  it("places a picture centred on the drop point, at most 600 on its long edge, keeping its shape", () => {
    expect(placeRef("r", "/m.png", 1000, 500, 1600, 800)).toEqual({ id: "r", src: "/m.png", x: 700, y: 350, w: 600, h: 300 });
    expect(placeRef("r", "/m.png", 0, 0, 200, 100)).toMatchObject({ w: 200, h: 100, x: -100, y: -50 });
    expect(placeRef("r", "/m.png", 0, 0, 0, 0)).toMatchObject({ w: 600, h: 600 }); // size unknown: a square
  });
});

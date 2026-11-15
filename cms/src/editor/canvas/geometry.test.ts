import { describe, expect, it } from "vitest";
import { align, axisLock, distribute, resize, snapMove } from "./geometry";

const board = { width: 390, height: 400 };

describe("axis lock", () => {
  it("keeps the larger movement", () => {
    expect(axisLock(30, 4)).toEqual({ dx: 30, dy: 0 });
    expect(axisLock(-3, 12)).toEqual({ dx: 0, dy: 12 });
  });
});

describe("snapping", () => {
  it("snaps to the artboard edges and centre", () => {
    expect(snapMove({ x: 3, y: 100, w: 50, h: 50 }, [], board, 6).box.x).toBe(0);
    const centred = snapMove({ x: 168, y: 100, w: 50, h: 50 }, [], board, 6);
    expect(centred.box.x).toBe(170); // centre 195
    expect(centred.guides).toContainEqual(expect.objectContaining({ axis: "x", pos: 195 }));
    expect(snapMove({ x: 338, y: 100, w: 50, h: 50 }, [], board, 6).box.x).toBe(340);
  });
  it("snaps to other layers' edges and centres with a guide spanning both", () => {
    const other = { x: 100, y: 20, w: 80, h: 40 };
    const { box, guides } = snapMove({ x: 103, y: 210, w: 30, h: 30 }, [other], board, 6);
    expect(box.x).toBe(100);
    expect(guides).toEqual([{ axis: "x", pos: 100, from: 20, to: 240 }]);
    expect(snapMove({ x: 40, y: 38, w: 30, h: 30 }, [other], board, 6).box.y).toBe(40); // top to other's middle... nearest wins
  });
  it("leaves the box alone outside the threshold", () => {
    const r = snapMove({ x: 20, y: 120, w: 50, h: 50 }, [], board, 6);
    expect(r.box).toEqual({ x: 20, y: 120, w: 50, h: 50 });
    expect(r.guides).toEqual([]);
  });
  it("picks the closest of several candidates", () => {
    const { box } = snapMove({ x: 96, y: 300, w: 40, h: 10 }, [{ x: 100, y: 0, w: 200, h: 10 }, { x: 98, y: 50, w: 200, h: 10 }], board, 6);
    expect(box.x).toBe(98);
  });
});

describe("resize", () => {
  const start = { x: 100, y: 100, w: 100, h: 50 };
  it("moves the dragged edges only", () => {
    expect(resize(start, "se", 20, 10).box).toEqual({ x: 100, y: 100, w: 120, h: 60 });
    expect(resize(start, "nw", 20, 10).box).toEqual({ x: 120, y: 110, w: 80, h: 40 });
    expect(resize(start, "e", 20, 99).box).toEqual({ x: 100, y: 100, w: 120, h: 50 });
  });
  it("keeps the aspect ratio with Shift", () => {
    expect(resize(start, "se", 100, 0, { keepRatio: true }).box).toEqual({ x: 100, y: 100, w: 200, h: 100 });
    expect(resize(start, "nw", -100, 0, { keepRatio: true }).box).toEqual({ x: 0, y: 50, w: 200, h: 100 });
  });
  it("never collapses below the minimum", () => {
    expect(resize(start, "e", -500, 0).box.w).toBe(8);
    const r = resize(start, "w", 500, 0).box;
    expect(r).toMatchObject({ w: 8, x: 192 });
  });
  it("snaps the moving edge", () => {
    const r = resize(start, "e", 187, 0, { artboard: board, threshold: 6 });
    expect(r.box.w).toBe(290); // right edge lands on the artboard edge at 390
    expect(r.guides[0]).toMatchObject({ axis: "x", pos: 390 });
  });
});

describe("align and distribute", () => {
  const a = { id: "a", x: 10, y: 10, w: 20, h: 20 };
  const b = { id: "b", x: 100, y: 60, w: 40, h: 40 };
  const c = { id: "c", x: 300, y: 200, w: 20, h: 60 };
  it("aligns one box to the artboard", () => {
    expect(align([a], "center", board)[0]!.x).toBe(185);
    expect(align([a], "right", board)[0]!.x).toBe(370);
    expect(align([a], "middle", board)[0]!.y).toBe(190);
    expect(align([a], "bottom", board)[0]!.y).toBe(380);
  });
  it("aligns several boxes to their shared bounds", () => {
    expect(align([a, b, c], "left", board).map((r) => r.x)).toEqual([10, 10, 10]);
    expect(align([a, b, c], "right", board).map((r) => r.x)).toEqual([300, 280, 300]);
    expect(align([a, b], "top", board).map((r) => r.y)).toEqual([10, 10]);
  });
  it("distributes with equal gaps and keeps ids and order", () => {
    const out = distribute([c, a, b], "x");
    expect(out.map((r) => r.id)).toEqual(["c", "a", "b"]);
    const byId = Object.fromEntries(out.map((r) => [r.id, r]));
    expect(byId.a!.x).toBe(10);
    expect(byId.c!.x).toBe(300);
    expect(byId.b!.x).toBe(145); // gaps of 115 either side
    expect(distribute([a, b], "x")).toEqual([a, b]);
  });
});

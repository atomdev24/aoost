import { describe, expect, it } from "vitest";
import { DEFAULT_FRAME_FIT } from "../../schema";
import { dragImage, imageRect, scaleImage } from "./adjust";

const frame = { w: 400, h: 200 };
const natural = { w: 1000, h: 1000 };

describe("adjust image", () => {
  it("covers the frame around the focal point", () => {
    expect(imageRect(DEFAULT_FRAME_FIT, frame, natural)).toEqual({ x: 0, y: -100, w: 400, h: 400 });
    expect(imageRect({ ...DEFAULT_FRAME_FIT, focalY: 0 }, frame, natural).y + 0).toBe(0);
  });
  it("dragging moves the focal point in Fill, the pan in Free", () => {
    const moved = dragImage(DEFAULT_FRAME_FIT, frame, natural, 0, 50);
    expect(moved.focalY).toBe(25);
    expect(imageRect(moved, frame, natural).y).toBe(-50);
    const free = dragImage({ ...DEFAULT_FRAME_FIT, fit: "free" }, frame, natural, 40, 20);
    expect([free.panX, free.panY]).toEqual([10, 10]);
  });
  it("scaling switches to Free and starts from what Fill shows", () => {
    const f = scaleImage(DEFAULT_FRAME_FIT, 1.5);
    expect(f.fit).toBe("free");
    expect(f.zoom).toBe(1.5);
    expect(imageRect({ ...f, zoom: 1 }, frame, natural)).toEqual(imageRect(DEFAULT_FRAME_FIT, frame, natural));
  });
});

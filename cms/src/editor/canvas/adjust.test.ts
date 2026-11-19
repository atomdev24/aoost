import { describe, expect, it } from "vitest";
import { DEFAULT_FRAME_FIT } from "../../schema";
import { coverClamp, dragImage, fillFrame, imageRect, panRange, scaleImage, type Size } from "./adjust";

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
    const free = dragImage({ ...DEFAULT_FRAME_FIT, fit: "free", zoom: 2 }, frame, natural, 40, 20);
    expect([free.panX, free.panY]).toEqual([10, 10]);
  });
  it("scaling switches to Free and starts from what Fill shows", () => {
    const f = scaleImage(DEFAULT_FRAME_FIT, 1.5);
    expect(f.fit).toBe("free");
    expect(f.zoom).toBe(1.5);
    expect(imageRect({ ...f, zoom: 1 }, frame, natural)).toEqual(imageRect(DEFAULT_FRAME_FIT, frame, natural));
  });
});

/** Does the picture cover the whole frame (to a hundredth of a pixel)? */
const covers = (f: Parameters<typeof imageRect>[0], fr: Size, nat: Size) => {
  const r = imageRect(f, fr, nat);
  const e = 0.01;
  return r.x <= e && r.y <= e && r.x + r.w >= fr.w - e && r.y + r.h >= fr.h - e;
};

describe("free mode keeps the picture covering its frame", () => {
  const frames = { "portrait frame": { w: 390, h: 640 }, "landscape frame": { w: 1200, h: 500 } };
  const pictures = { "portrait picture": { w: 800, h: 1200 }, "landscape picture": { w: 1600, h: 900 } };
  const free = { ...DEFAULT_FRAME_FIT, fit: "free" as const };
  for (const [fn, fr] of Object.entries(frames))
    for (const [pn, nat] of Object.entries(pictures)) {
      it(`${pn} in a ${fn}: drags stop at the edges`, () => {
        for (const [dx, dy] of [[-5000, 0], [5000, 0], [0, -5000], [0, 5000], [-3000, 3000]] as const) {
          for (const start of [free, { ...free, zoom: 1.6, focalX: 20, focalY: 80 }]) {
            const moved = dragImage(start, fr, nat, dx, dy);
            expect(covers(moved, fr, nat)).toBe(true);
          }
        }
        // Zoomed in, a drag far left pins the picture's right edge to the frame's.
        const z = dragImage({ ...free, zoom: 2 }, fr, nat, -99999, 0);
        const r = imageRect(z, fr, nat);
        expect(r.x + r.w).toBeGreaterThanOrEqual(fr.w - 0.01);
        expect(r.x + r.w).toBeLessThan(fr.w + 1);
      });
      it(`${pn} in a ${fn}: zoom stays at least cover, and zooming out pulls the pan back in`, () => {
        expect(scaleImage(free, 0.3, fr, nat).zoom).toBe(1);
        const panned = dragImage({ ...free, zoom: 3 }, fr, nat, 4000, 4000);
        const out = scaleImage(panned, 0.4, fr, nat);
        expect(out.zoom).toBeCloseTo(1.2, 5);
        expect(covers(out, fr, nat)).toBe(true);
      });
    }

  it("Alt allows overhang, for deliberate gaps", () => {
    const fr = { w: 390, h: 640 };
    const nat = { w: 1600, h: 900 };
    const gap = dragImage(free, fr, nat, -1000, 0, { overhang: true });
    expect(covers(gap, fr, nat)).toBe(false);
    expect(gap.panX).toBeCloseTo((-1000 / 390) * 100, 1);
    expect(scaleImage(free, 0.5, fr, nat, { overhang: true }).zoom).toBe(0.5);
  });

  it("leaves a stored gap alone until it is moved back, and never makes it wider", () => {
    const fr = { w: 400, h: 200 };
    const nat = { w: 1000, h: 1000 };
    const stored = { ...free, panX: -40 }; // an existing gap on the right
    expect(covers(stored, fr, nat)).toBe(false);
    // A vertical nudge keeps the stored horizontal pan exactly.
    expect(dragImage(stored, fr, nat, 0, 10).panX).toBe(-40);
    // Moving further out is stopped; moving back in closes the gap and then clamps.
    expect(dragImage(stored, fr, nat, -50, 0).panX).toBe(-40);
    const back = dragImage(stored, fr, nat, 400, 0);
    expect(covers(back, fr, nat)).toBe(true);
    // An old zoom below 1 isn't forced up, but can't shrink further.
    expect(scaleImage({ ...free, zoom: 0.5 }, 0.5, fr, nat).zoom).toBe(0.5);
  });

  it("the pan range is empty only when the picture is smaller than the frame", () => {
    const fr = { w: 400, h: 200 };
    const nat = { w: 1000, h: 1000 };
    const r = panRange(free, fr, nat);
    expect(r.x[0]).toBeCloseTo(0);
    expect(r.x[1]).toBeCloseTo(0);
    expect(r.y[0]).toBeLessThan(r.y[1]);
    expect(coverClamp({ ...free, panY: 999 }, free, fr, nat).panY).toBe(50);
  });

  it("Fill frame resets to cover, centred on the focal point", () => {
    const f = fillFrame({ ...free, zoom: 2.5, panX: -30, panY: 12, focalX: 25, focalY: 70 });
    expect(f).toEqual({ ...DEFAULT_FRAME_FIT, fit: "fill", focalX: 25, focalY: 70 });
  });
});

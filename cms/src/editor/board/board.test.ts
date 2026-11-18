import { describe, expect, it } from "vitest";
import { pinViewportUnits } from "./frame-css";
import { clampZoom, fitAll, isVisible, layoutFrames, reveal, slotRect, stepZoom, zoomAt } from "./viewport";

describe("board layout", () => {
  it("puts desktop then mobile side by side, tops aligned, with the add slot after", () => {
    const frames = layoutFrames({ desktop: 3000, mobile: 5000 });
    expect(frames.map((f) => [f.bp, f.x, f.y, f.w, f.h])).toEqual([
      ["desktop", 0, 0, 1440, 3000],
      ["mobile", 1560, 0, 390, 5000],
    ]);
    expect(slotRect(frames).x).toBe(1560 + 390 + 120);
  });
});

describe("zoom", () => {
  it("keeps the point under the cursor still", () => {
    const v = zoomAt({ x: 100, y: 50, zoom: 0.5 }, 1, 300, 250);
    // world point under (300, 250) before: ((300-100)/0.5, (250-50)/0.5) = (400, 400)
    expect([v.zoom, 400 * v.zoom + v.x, 400 * v.zoom + v.y]).toEqual([1, 300, 250]);
  });
  it("steps through the zoom levels and clamps", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(0.4, 1)).toBe(0.5);
    expect(stepZoom(4, 1)).toBe(4);
    expect(clampZoom(0)).toBe(0.05);
  });
});

describe("fit all", () => {
  it("fits every frame across the view", () => {
    const frames = layoutFrames({ desktop: 4000, mobile: 7000 });
    const rects = [...frames, slotRect(frames)];
    const v = fitAll(rects, 908, 848);
    const right = rects[2]!.x + rects[2]!.w;
    expect(v.zoom).toBeCloseTo((908 - 96) / right, 5);
    expect(0 * v.zoom + v.x).toBeCloseTo((908 - right * v.zoom) / 2, 5);
  });
  it("fits the whole height when the pages are short", () => {
    const frames = layoutFrames({ desktop: 900, mobile: 1200 });
    const v = fitAll([...frames, slotRect(frames)], 908, 848);
    expect(1200 * v.zoom).toBeLessThanOrEqual(848);
  });
});

describe("reveal and visibility", () => {
  it("leaves the view alone when the block shows, pans when it doesn't", () => {
    const view = { x: 0, y: 0, zoom: 0.5 };
    expect(reveal(view, { x: 100, y: 100, w: 200, h: 100 }, 900, 800)).toBe(view);
    const moved = reveal(view, { x: 1600, y: 3000, w: 390, h: 300 }, 900, 800);
    expect((1600 + 195) * moved.zoom + moved.x).toBeCloseTo(450);
  });
  it("knows which frames are off screen", () => {
    expect(isVisible({ x: 0, y: 0, zoom: 1 }, { x: 2000, y: 0, w: 390, h: 900 }, 900, 800)).toBe(false);
    expect(isVisible({ x: 0, y: 0, zoom: 0.3 }, { x: 2000, y: 0, w: 390, h: 900 }, 900, 800)).toBe(true);
  });
});

describe("viewport units in editor frames", () => {
  it("pins vh, svh, dvh and lvh to the frame's screen height", () => {
    expect(pinViewportUnits(".h{min-height:72svh;height:100dvh;top:-10vh;max-height:.5lvh}", 900)).toBe(".h{min-height:648px;height:900px;top:-90px;max-height:4.5px}");
    expect(pinViewportUnits(".a{width:100vw}", 900)).toBe(".a{width:100vw}");
  });
});

describe("mobile overrides count", () => {
  it("counts values that differ between mobile and desktop", async () => {
    const { countMobileOverrides } = await import("./overrides");
    const page = {
      sections: [
        { layout: { base: { columns: 1, gap: 14 }, desktop: { columns: 3, gap: 14 } }, children: [{ style: { base: { width: "100%" }, desktop: { width: "50%", padding: "4px" } } }] },
        { layout: { base: { columns: 1, gap: 0 } }, children: [] },
      ],
      overlays: [],
    } as never;
    expect(countMobileOverrides(page)).toBe(3);
  });
});

describe("block overrides", () => {
  it("counts and resets one block's mobile changes", async () => {
    const { blockOverrides, resetBlockOverrides } = await import("./overrides");
    const node = { id: "n1", type: "Text", content: {}, style: { base: { padding: "4px", opacity: 0.5 }, desktop: { padding: "20px", opacity: 1 } } };
    const page = { id: "p", title: "P", slug: "/", parentId: null, status: "draft", template: "blank", seo: {}, isHome: false, showInNav: false, overlays: [], sections: [{ id: "s1", kind: "flow", layout: { base: { columns: 1, gap: 0, padding: "0px" } }, children: [node] }] } as never;
    expect(blockOverrides(page, "n1")).toBe(2);
    const reset = resetBlockOverrides(page, "n1") as unknown as { sections: { children: { style: unknown }[] }[] };
    expect(reset.sections[0]!.children[0]!.style).toEqual({ base: { padding: "20px", opacity: 1 } });
  });
});

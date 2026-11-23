import { describe, expect, it } from "vitest";
import type { Node, Section } from "../schema";
import { layerBox } from "./canvas";

const section = (nodes: Node[]): Section => ({ id: "s1", kind: "canvas", layout: { base: { columns: 1, gap: 0, padding: "0px", height: 480 }, desktop: { columns: 1, gap: 0, padding: "0px", height: 720 } }, children: nodes });
const desktopFirst: Node = { id: "n1", type: "Image", content: {}, style: { base: {}, desktop: { x: 720, y: 360, w: 360, h: 180 } } };

describe("free-layout boxes on each screen size", () => {
  it("a layer placed on desktop first shows on phones as the desktop composition, scaled to fit", () => {
    const s = section([desktopFirst]);
    const m = layerBox(s, desktopFirst, "mobile");
    // 1440 → 390 wide (×0.2708), well within the 480 tall phone artboard
    expect(m).toMatchObject({ x: 195, y: 97.5, w: 97.5, h: 48.75 });
    // tablet follows the phone, scaled up
    expect(layerBox(s, desktopFirst, "tablet").x).toBeCloseTo(195 * (834 / 390), 1);
  });
  it("a box set on mobile overrides the derived one; desktop stays as placed", () => {
    const n: Node = { ...desktopFirst, style: { base: { x: 20, y: 30, w: 97.5, h: 48.75 }, desktop: desktopFirst.style.desktop } };
    const s = section([n]);
    expect(layerBox(s, n, "mobile")).toMatchObject({ x: 20, y: 30 });
    expect(layerBox(s, n, "desktop")).toMatchObject({ x: 720, y: 360, w: 360, h: 180 });
  });
  it("a layer placed on mobile first still leads desktop as before", () => {
    const n: Node = { id: "n2", type: "Image", content: {}, style: { base: { x: 0, y: 0, w: 195, h: 100 } } };
    expect(layerBox(section([n]), n, "desktop").w).toBeGreaterThan(195);
  });
});

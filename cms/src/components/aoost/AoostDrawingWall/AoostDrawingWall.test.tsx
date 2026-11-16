import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AoostDrawingWall, AoostDrawingWallContent } from "./AoostDrawingWall";

const d = AoostDrawingWall.defaults.content;

describe("AoostDrawingWall", () => {
  it("is hidden by default, exactly as on the live site", () => {
    const html = renderNode("AoostDrawingWall", d);
    expect(d.show).toBe(false);
    expect(html).toContain('<section aria-labelledby="h-wall" hidden="">');
    expect(html).toContain('data-ao="wall" data-mat="dark" data-off=""');
    expect(html).not.toContain("switched off");
  });
  it("keeps the original editor chrome and every id the script drives", () => {
    const html = renderNode("AoostDrawingWall", { ...d, show: true });
    expect(html).toContain('<section aria-labelledby="h-wall">');
    expect(html).toContain('<h2 id="h-wall" data-underline="4">the wall</h2>');
    for (const id of ["ps", "imageMenu", "optbar", "curTool", "size", "sizeOut", "op", "opOut", "optNote", "noteCols", "zoomTxt", "fgBtn", "palette", "canvasarea", "board", "bg", "stkLayer", "paint", "layerCount", "layers", "bgHex", "bgTray", "bgPick", "xy", "save", "toast"]) {
      expect(html, id).toContain(`id="${id}"`);
    }
    expect(html.match(/class="tool"/g)).toHaveLength(6);
  });
  it("defaults to the original palettes and validates colours", () => {
    expect(d.paint.map((p) => p.name)).toEqual(["Black", "White", "Blue", "Pink", "Lime", "Orange"]);
    expect(d.backgrounds).toHaveLength(8);
    expect(AoostDrawingWallContent.safeParse({ ...d, paint: [{ name: "Bad", color: "red" }] }).success).toBe(false);
    expect(AoostDrawingWallContent.safeParse({ ...d, paint: [] }).success).toBe(false);
  });
  it("says it is switched off in the editor", () => {
    expect(renderNode("AoostDrawingWall", d, { editing: true })).toContain("The wall is switched off");
  });
});

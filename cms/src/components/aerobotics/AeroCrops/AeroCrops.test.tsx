import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroCrops } from "./AeroCrops";

describe("AeroCrops", () => {
  it("shows the crop icons with their names", () => {
    const html = renderNode("AeroCrops", { ...AeroCrops.defaults.content });
    expect(html).toContain("aero_crop_orange");
    expect(html).toContain('alt="Kiwifruit"');
  });
});

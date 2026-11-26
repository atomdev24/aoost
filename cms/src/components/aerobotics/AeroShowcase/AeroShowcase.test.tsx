import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroShowcase } from "./AeroShowcase";

describe("AeroShowcase", () => {
  it("frames the platform screenshot on the photo", () => {
    const html = renderNode("AeroShowcase", { ...AeroShowcase.defaults.content });
    expect(html).toContain("abw-frame");
    expect(html).toContain("aero_dash_yield");
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroFeatures } from "./AeroFeatures";

describe("AeroFeatures", () => {
  it("lists each point with its icon", () => {
    const html = renderNode("AeroFeatures", { ...AeroFeatures.defaults.content });
    expect(html).toContain("25x larger sample sizes");
    expect(html).toContain("aero_icon_timer");
    expect(html).toContain("abf-rule");
  });
});

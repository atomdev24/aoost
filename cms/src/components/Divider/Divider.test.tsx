import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

describe("Divider", () => {
  it("renders a real separator in each style", () => {
    expect(renderNode("Divider", { variant: "line" })).toBe('<hr class="div div-line"/>');
    expect(renderNode("Divider", { variant: "dashed" })).toContain("div-dashed");
    expect(renderNode("Divider", { variant: "drawn" })).toContain('role="separator"');
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroFooter } from "./AeroFooter";

describe("AeroFooter", () => {
  it("links every column and social", () => {
    const html = renderNode("AeroFooter", { ...AeroFooter.defaults.content });
    expect(html).toContain('href="https://aerobotics.com/true-fruit-size"');
    expect(html).toContain('aria-label="LinkedIn"');
    expect(html).toContain('href="https://page.aerobotics.com/legal"');
  });
});

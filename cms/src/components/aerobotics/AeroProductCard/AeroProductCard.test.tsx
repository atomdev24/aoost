import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroProductCard } from "./AeroProductCard";

describe("AeroProductCard", () => {
  it("puts the product on its photo with both buttons", () => {
    const html = renderNode("AeroProductCard", { ...AeroProductCard.defaults.content });
    expect(html).toContain("TrueFruit Bin Scan");
    expect(html).toContain('href="https://aerobotics.com/pricing"');
    expect(html).toContain("background:#2A241F");
  });
});

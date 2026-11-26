import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroSplit } from "./AeroSplit";

describe("AeroSplit", () => {
  it("draws the graph cards beside the photo, with the crop icons", () => {
    const html = renderNode("AeroSplit", { ...AeroSplit.defaults.content });
    expect(html).toContain("abs-m-picture-cards");
    expect(html).toContain("abg-legend");
    expect(html).toContain("abg-bars");
    expect(html).toContain('alt="Pomegranates"');
  });
});

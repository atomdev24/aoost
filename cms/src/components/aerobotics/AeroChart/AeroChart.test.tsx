import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroChart } from "./AeroChart";

describe("AeroChart", () => {
  it("draws one bar per value with its label", () => {
    const html = renderNode("AeroChart", { ...AeroChart.defaults.content });
    expect(html).toContain("Count 72");
    expect(html).toContain("30%");
    expect(html).toContain("<rect");
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroPricing } from "./AeroPricing";

describe("AeroPricing", () => {
  it("ticks off each point of the plan", () => {
    const html = renderNode("AeroPricing", { ...AeroPricing.defaults.content });
    expect(html).toContain("Custom package");
    expect(html).toContain("<li>Volume-based pricing per acre</li>");
    expect(html).toContain("Request quote");
  });
});

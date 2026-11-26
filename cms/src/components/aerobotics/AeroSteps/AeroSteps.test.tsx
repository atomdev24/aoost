import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroSteps } from "./AeroSteps";

describe("AeroSteps", () => {
  it("numbers the steps and shows the card", () => {
    const html = renderNode("AeroSteps", { ...AeroSteps.defaults.content });
    expect(html).toContain("<li>Sign our partners agreement</li>");
    expect(html).toContain("Mapping Flights");
  });
});

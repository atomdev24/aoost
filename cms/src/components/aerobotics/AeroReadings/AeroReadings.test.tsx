import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroReadings } from "./AeroReadings";

describe("AeroReadings", () => {
  it("shows each reading as a tag", () => {
    const html = renderNode("AeroReadings", { ...AeroReadings.defaults.content });
    expect(html).toContain("Peak size");
    expect(html).toContain("Count 88");
    expect(html).toContain("95% above color break");
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroCta } from "./AeroCta";

describe("AeroCta", () => {
  it("shows the line and both buttons", () => {
    const html = renderNode("AeroCta", { ...AeroCta.defaults.content });
    expect(html).toContain("Increase your packouts");
    expect(html).toContain('href="https://aerobotics.com/pricing"');
  });
});

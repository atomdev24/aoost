import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroStats } from "./AeroStats";

describe("AeroStats", () => {
  it("shows each number with its label", () => {
    const html = renderNode("AeroStats", { ...AeroStats.defaults.content });
    expect(html).toContain("2014");
    expect(html).toContain("Year founded");
  });
});

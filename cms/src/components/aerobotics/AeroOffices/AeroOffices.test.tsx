import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroOffices } from "./AeroOffices";

describe("AeroOffices", () => {
  it("lists the offices line by line", () => {
    const html = renderNode("AeroOffices", { ...AeroOffices.defaults.content });
    expect(html).toContain("Cape Town Head Office");
    expect(html).toContain("<span>Tel: +27 21 035 1060</span>");
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroLogos } from "./AeroLogos";

describe("AeroLogos", () => {
  it("lists every logo", () => {
    const html = renderNode("AeroLogos", { ...AeroLogos.defaults.content });
    expect(html).toContain('alt="Daltex"');
    expect(html).toContain("abl-row");
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroLogos } from "./AeroLogos";

describe("AeroLogos", () => {
  it("lists every logo", () => {
    const html = renderNode("AeroLogos", { ...AeroLogos.defaults.content });
    expect(html).toContain('alt="Daltex"');
    expect(html).toContain("abt-track");
  });
  it("keeps strips saved before the ticker still", () => {
    const { logosMotion: _m, ...old } = AeroLogos.defaults.content;
    const html = renderNode("AeroLogos", old);
    expect(html).toContain("abl-row");
    expect(html).not.toContain("abt-track");
  });
});

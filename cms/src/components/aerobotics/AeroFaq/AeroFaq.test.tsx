import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroFaq } from "./AeroFaq";

describe("AeroFaq", () => {
  it("opens each question to its answer", () => {
    const html = renderNode("AeroFaq", { ...AeroFaq.defaults.content });
    expect(html).toContain("<details>");
    expect(html).toContain("<summary>What is TrueFruit?</summary>");
  });
});

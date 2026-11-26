import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroTestimonial } from "./AeroTestimonial";

describe("AeroTestimonial", () => {
  it("quotes the customer once, in curly quotes", () => {
    const html = renderNode("AeroTestimonial", { ...AeroTestimonial.defaults.content });
    expect(html).toContain("“Previously we were measuring");
    expect(html).toContain("Claude, Unifrutti");
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroStories } from "./AeroStories";

describe("AeroStories", () => {
  it("links each story card to its page", () => {
    const html = renderNode("AeroStories", { ...AeroStories.defaults.content });
    expect(html).toContain('href="https://aerobotics.com/success-stories/ac-foods-testimonial"');
    expect(html).toContain("abst-play");
  });
});

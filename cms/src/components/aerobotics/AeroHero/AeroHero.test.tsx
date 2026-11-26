import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroHero } from "./AeroHero";

describe("AeroHero", () => {
  it("puts the headline, both buttons and the logos on the photo", () => {
    const html = renderNode("AeroHero", { ...AeroHero.defaults.content });
    expect(html).toContain("abh-logos");
    expect(html).toContain('href="https://aerobotics.com/request-a-demo"');
    expect(html).toContain("aero_hero_home");
    expect(html).toContain('alt="AC Foods"');
  });
});

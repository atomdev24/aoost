import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroHero } from "./AeroHero";

describe("AeroHero", () => {
  it("draws bold, italic and links in its text (edited in place)", () => {
    const html = renderNode("AeroHero", { ...AeroHero.defaults.content, text: "Measure **every** fruit, *fast*. [See how](/how)" });
    expect(html).toContain("<strong>every</strong>");
    expect(html).toContain("<em>fast</em>");
    expect(html).toContain('href="/how"');
  });
  it("puts the headline, both buttons and the logos on the photo", () => {
    const html = renderNode("AeroHero", { ...AeroHero.defaults.content });
    expect(html).toContain("abh-ticker");
    expect(html).toContain('href="https://aerobotics.com/request-a-demo"');
    expect(html).toContain("aero_hero_home");
    expect(html).toContain('alt="AC Foods"');
  });
  it("scrolls the logos like the Framer ticker, or keeps them still", () => {
    const html = renderNode("AeroHero", { ...AeroHero.defaults.content });
    expect(html).toContain("--abt-gap:56px");
    expect(html).toContain("--abt-fade:25%");
    // Eight logos fill two copies of a ten-wide row; only the first eight are read out.
    expect((html.match(/alt="AC Foods"/g) ?? []).length).toBe(1);
    const still = renderNode("AeroHero", { ...AeroHero.defaults.content, logosMotion: "still" });
    expect(still).toContain("abh-logos");
    expect(still).not.toContain("abt-track");
  });
  it("keeps older heroes (saved before the ticker) scrolling", () => {
    const { logosMotion: _m, ...old } = AeroHero.defaults.content;
    expect(renderNode("AeroHero", old)).toContain("abt-track");
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AoostAbout } from "./AoostAbout";

const d = AoostAbout.defaults.content;

describe("AoostAbout", () => {
  it("renders the label, the line, the byline and a hairline on the light mat", () => {
    const html = renderNode("AoostAbout", d);
    expect(html).toContain('data-ao="about" data-mat="light"');
    expect(html).toContain('<p class="label ab-k">aoost / about</p>');
    expect(html).toContain('<p class="ab-line">Things I make, when I get to them.</p>');
    expect(html).toContain('<p class="ab-by">Alex · Cape Town</p>');
    expect(html).toContain('<hr class="ab-rule"/>');
    expect(html).not.toContain("ab-links");
  });
  it("shows the site's socials as links when switched on, and nothing else when the text is empty", () => {
    const html = renderNode("AoostAbout", { mat: "light", showSocials: true });
    expect(html).not.toContain("ab-line");
    expect(html).toMatch(/<p class="ab-links"><a href="https:\/\/[^"]+" target="_blank" rel="noopener">[^<]+<\/a>/);
  });
});

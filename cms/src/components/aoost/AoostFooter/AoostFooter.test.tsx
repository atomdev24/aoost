import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AoostFooter } from "./AoostFooter";

const d = AoostFooter.defaults.content;

describe("AoostFooter", () => {
  it("keeps the original footer: the scorpion and the sign-off", () => {
    const html = renderNode("AoostFooter", d);
    expect(html).toContain('<footer><svg class="doodle scorp" viewBox="0 0 120 70" aria-hidden="true"><g class="legs">');
    expect(html).toContain('<span class="label">aoost · 2026</span></footer>');
    expect(html).not.toContain("ao-socials");
  });
  it("can add the site's social links and drop the scorpion", () => {
    const html = renderNode("AoostFooter", { ...d, showSocials: true, showScorpion: false, text: "aoost · 2027" });
    expect(html).toContain('<a class="label" href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a>');
    expect(html).not.toContain("scorp");
    expect(html).toContain("aoost · 2027");
  });
});

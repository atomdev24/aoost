import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AoostJournals, AoostJournalsContent } from "./AoostJournals";

const d = AoostJournals.defaults.content;

describe("AoostJournals", () => {
  it("keeps the original section, heading and shelf", () => {
    const html = renderNode("AoostJournals", d);
    expect(html).toContain('<section class="focus-sec journals" aria-labelledby="h-jr">');
    expect(html).toContain('<h2 id="h-jr" data-underline="1">journals</h2><p class="jr-sub">tap a book to open it</p>');
    expect(html).toContain('<div class="jr-shelf" id="jrShelf">');
  });
  it("defaults to today's four live journals, including the page made in Atom", () => {
    expect(d.journals.map((j) => j.title)).toEqual(["sketchbook 01", "hear no evil", "stars & static", "late nights"]);
    expect(d.journals[0]!.pages[0]).toMatchObject({ paper: "black", spread: true, items: [{ kind: "sticker" }] });
    expect(AoostJournalsContent.safeParse(d).success).toBe(true);
  });
  it("draws each book as the script does: tilt, cover, sticker, band, caption", () => {
    const html = renderNode("AoostJournals", d);
    expect(html.match(/class="jr"/g)).toHaveLength(4);
    expect(html).toContain('aria-label="Open journal: sketchbook 01" style="--r:-5deg;--i:0"');
    expect(html).toContain("--cbg:url(&#x27;/art/j-star1.jpg&#x27;) center/cover no-repeat,#222");
    expect(html).toContain('<img class="st" src="/art/hear-no-evil-ring.png" alt=""/>');
    expect(html).toContain("--band:#7A1A1A");
    expect(html).toContain("<i>02</i><b>hear no evil</b><span>8 pages · 2025</span>");
    expect(html).toContain("<span>2 pages · 2025</span>"); // one page is rounded up to a spread
  });
  it("leaves hidden journals off the shelf and renders cover extras", () => {
    const html = renderNode("AoostJournals", { ...d, journals: [{ ...d.journals[1]!, options: { ribbon: "#C8161F", wear: "light", titleStamp: true } }, { ...d.journals[2]!, hidden: true }] });
    expect(html.match(/class="jr"/g)).toHaveLength(1);
    expect(html).toContain('<span class="jrib" style="--rib:#C8161F"></span>');
    expect(html).toContain('<span class="jw jw-light"></span>');
    expect(html).toContain('<span class="jstamp">hear no evil</span>');
  });
});

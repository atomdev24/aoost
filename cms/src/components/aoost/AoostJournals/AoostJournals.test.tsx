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
  it("renders no line under the heading when sub is empty", () => {
    for (const sub of ["", "  "]) {
      const html = renderNode("AoostJournals", { ...d, sub });
      expect(html).toContain('<h2 id="h-jr" data-underline="1">journals</h2>');
      expect(html).not.toContain("jr-sub");
    }
  });
});

describe("AoostJournals cover materials", () => {
  const book = (j: Partial<AoostJournalsContent["journals"][number]>) => renderNode("AoostJournals", { ...d, journals: [{ title: "b", pages: [], coverColor: "#B48A5C", sticker: "/art/s.png", band: "#7A1A1A", ...j }] });
  const coverOf = (html: string) => /<span class="jr-cv[^"]*"[^>]*>.*?<span class="jr-lbl">/.exec(html)![0];

  it("none (or nothing) is today's plain cover, unchanged", () => {
    const plain = book({});
    const markup = (html: string) => html.replace(/<script[^]*<\/script>/, "");
    expect(markup(book({ material: "none" }))).toBe(markup(plain));
    expect(coverOf(plain)).toMatch(/^<span class="jr-cv cvx" style="--cbg:#B48A5C;--tone:#333;--band:#7A1A1A"><img class="st" src="\/art\/s.png" alt=""\/><span class="jr-band"><\/span>/);
    expect(plain).not.toContain("jmat");
  });

  it("kraft board: a texture layer over the cover colour, under the sticker and band", () => {
    const cv = coverOf(book({ material: "kraft" }));
    expect(cv).toMatch(/^<span class="jr-cv cvx cv-kraft" style="--cbg:#B48A5C;[^"]*"><span class="jmat"><\/span><img class="st" src="\/art\/s.png" alt=""\/><span class="jr-band"><\/span>/);
    // No colour of its own: a warm kraft brown.
    expect(coverOf(book({ material: "kraft", coverColor: undefined }))).toContain("--cbg:#A47A4E");
    expect(AoostJournals.css).toMatch(/\.cv-kraft \.jmat\{background:url\("data:image\/svg\+xml,[^"]*feTurbulence/);
  });

  it("worn leather: grain, scuffs and the sheen; the sticker and a cover image sit on it", () => {
    const cv = coverOf(book({ material: "leather", coverColor: "#141516" }));
    expect(cv).toMatch(/^<span class="jr-cv cvx cv-leather" style="--cbg:#141516;[^"]*"><span class="jmat"><\/span><img class="st"/);
    expect(cv).toContain('<span class="jr-band"></span>');
    expect(coverOf(book({ material: "leather", cover: "/art/c.jpg" }))).toContain('class="jr-cv cvx cv-leather cv-img"');
    expect(AoostJournals.css).toMatch(/\.cv-leather \.jmat::before\{[^}]*feTurbulence%20type='turbulence'|\.cv-leather \.jmat::before\{[^}]*feTurbulence type='turbulence'/);
    expect(AoostJournals.css).toContain(".ao .jr:hover .cv-leather .jmat::after");
    expect(AoostJournals.css).toContain("@media (prefers-reduced-motion:reduce){.ao .cv-leather .jmat::after{transition:none}}");
  });

  it("only takes the three materials", () => {
    const ok = (material: string) => AoostJournalsContent.safeParse({ ...d, journals: [{ title: "x", pages: [], material }] }).success;
    expect(["none", "kraft", "leather"].map(ok)).toEqual([true, true, true]);
    expect(ok("paper")).toBe(false);
  });
});

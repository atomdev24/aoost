import { describe, expect, it } from "vitest";
import { createNode, createSection } from "../../../model/page-ops";
import { pageCss } from "../../../render/document";
import { Site } from "../../../schema";
import { fixtureSite } from "../../../seed/fixture";
import { renderNode } from "../../test-utils";
import { AoostProjects, AoostProjectsContent } from "./AoostProjects";

const d = AoostProjects.defaults.content;

describe("AoostProjects", () => {
  it("keeps the original markup and ids the script needs", () => {
    const html = renderNode("AoostProjects", d);
    expect(html).toContain('<div class="who-row"><p class="who">Alex · Cape Town</p></div>');
    expect(html).toContain('<section class="focus-sec" aria-labelledby="h-proj">');
    expect(html).toContain('<h2 id="h-proj" data-underline="0">projects</h2>');
    expect(html).toContain('<div class="sticky table-note" aria-hidden="true" data-note="0"></div>');
    expect(html).toContain('<div class="table" id="table"></div>');
    expect(html).toContain('<button class="keychain" id="keychain" type="button" aria-label="Monkey keychain, give it a swing">');
    expect(html).toContain('<input id="addArt" type="file" accept="image/*" multiple="" hidden=""/>');
  });
  it("defaults to today's seven live projects on the light mat", () => {
    expect(d.projects.map((p) => p.image)).toEqual(["hero.jpg", "grillz.jpg", "monkey-figure.jpg", "storefront.png", "hear-no-evil-3d.png", "flower-skull.png", "hear-no-evil-ring.png"].map((f) => `/art/${f}`));
    expect(AoostProjects.band!(d)).toBe("mat mat-light");
    expect(renderNode("AoostProjects", d)).toContain('data-ao="projects" data-mat="light"');
  });
  it("accepts the full project fields and passes them to the script", () => {
    const content = { ...d, projects: [{ image: "/art/hero.jpg", title: "Blue monkey", year: "2026", medium: "Digital", link: "https://example.com", tags: ["paint"], sticker: true }] };
    expect(AoostProjectsContent.safeParse(content).success).toBe(true);
    const json = JSON.parse(/data-ao-data="">(.*?)<\/script>/.exec(renderNode("AoostProjects", content))![1]!);
    expect(json.projects[0]).toMatchObject({ title: "Blue monkey", tags: ["paint"], sticker: true });
  });
  it("shows the pieces as a plain grid in the editor, and the optional line art", () => {
    const html = renderNode("AoostProjects", { ...d, showCactus: true, showSkull: true, projects: [...d.projects, { image: "/art/x.png", hidden: true }] }, { editing: true });
    expect(html).toContain('class="table ao-static"');
    expect(html.match(/class="piece"/g)).toHaveLength(7); // hidden projects stay off the table
    expect(html).toContain('class="doodle cactus"');
    expect(html).toContain('class="doodle skull"');
  });
  it("casts the board shadow on top only when it is on", () => {
    expect(renderNode("AoostProjects", d)).not.toContain("board-shadow");
    const html = renderNode("AoostProjects", { ...d, shadow: { show: true, style: "window", strength: 50, x: 30 } });
    expect(html).toContain('class="board-shadow" aria-hidden="true" data-shadow="window"');
    expect(html).toContain("--sh-k:0.5");
    expect(html).toContain("--sh-x:30%");
    expect(html).toContain("/art/shadow-window-shade.webp");
    expect(html).toContain("/art/shadow-window-sun.webp");
    // A custom shade replaces the preset, without the sunlight.
    const own = renderNode("AoostProjects", { ...d, shadow: { show: true, image: "/art/blinds.png" } });
    expect(own).toContain('data-shadow="custom"');
    expect(own).toContain("/art/blinds.png");
    expect(own).not.toContain("sh-sun");
    expect(AoostProjectsContent.safeParse({ ...d, shadow: { show: true, strength: 150 } }).success).toBe(false);
  });
  it("puts fixtures above the table and skips hidden ones", () => {
    const content = { ...d, fixtures: [{ image: "/art/clover-metal.png", x: 22, y: 30, width: 210, rotate: -8 }, { image: "/art/x.png", x: 50, y: 50, width: 100, hidden: true }] };
    expect(AoostProjectsContent.safeParse(content).success).toBe(true);
    const html = renderNode("AoostProjects", content);
    expect(html.match(/class="fixture"/g)).toHaveLength(1);
    expect(html).toContain('src="/art/clover-metal.png"');
    expect(html).toContain("--fx:22%;--fy:30%;--fw:210px;--fr:-8deg");
    // the fixture sits after the table so it stacks above every piece, even a lifted one
    expect(html.indexOf('id="table"')).toBeLessThan(html.indexOf('class="fixture"'));
    const css = AoostProjects.css!;
    expect(css).toContain(".ao .table{isolation:isolate}");
    expect(css).toMatch(/\.ao \.fixture\{[^}]*touch-action:pan-y/); // picked up and moved on the site; a swipe on a phone still scrolls
    expect(css).toContain(".ao .table.ao-static~.fixture{pointer-events:none}"); // but left alone in the editor
    expect(AoostProjectsContent.safeParse(d).success).toBe(true); // older content without fixtures still works
  });
  it("can drop the note, the keychain and the intro", () => {
    const html = renderNode("AoostProjects", { ...d, intro: "", note: { show: false }, keychain: { ...d.keychain, show: false } });
    expect(html).not.toContain("who-row");
    expect(html).not.toContain("table-note");
    expect(html).not.toContain('id="keychain"');
  });
  it("draws the eye on the note by default, and nothing on a plain note", () => {
    expect(d.note.style).toBe("eye");
    expect(renderNode("AoostProjects", { ...d, note: { show: true } })).toContain('<div class="sticky table-note" aria-hidden="true" data-note="0"></div>');
    const plain = renderNode("AoostProjects", { ...d, note: { show: true, style: "plain" } });
    expect(plain).toContain('<div class="sticky table-note" aria-hidden="true" data-note="0" data-note-style="plain"></div>');
    expect(AoostProjects.schema.safeParse({ ...d, note: { show: true, style: "doodle" } }).success).toBe(false);
  });
});

describe("AoostProjects piece size", () => {
  const site = Site.parse(fixtureSite);
  const cssFor = (projects: AoostProjectsContent["projects"]) => {
    const node = createNode("AoostProjects", { id: "pj1", content: { ...d, projects } });
    return pageCss(site, { ...site.pages[0]!, sections: [createSection("flow", { id: "s1", children: [node] })], overlays: [] });
  };
  const pieces = d.projects.slice(0, 3);

  it("writes nothing when no piece has a size, and the markup is unchanged", () => {
    const css = cssFor(pieces);
    expect(css).not.toMatch(/\.n-pj1 [^{]*\{[^}]*scale/);
    expect(css).not.toContain(".n-pj1 .table>.piece");
    expect(renderNode("AoostProjects", { ...d, projects: pieces })).not.toContain("size");
  });

  it("scales a piece around its own spot, per size", () => {
    const css = cssFor([pieces[0]!, { ...pieces[1]!, size: { base: { scale: 1.5 }, desktop: { scale: 1 }, widescreen: { scale: 2 } } }, pieces[2]!]);
    // The page's layout rules come last: the base rules, then one block per media query.
    const at = css.lastIndexOf("@media (min-width:900px)");
    const [mobile, rest] = [css.slice(0, at), css.slice(at)];
    expect(mobile).toContain(".n-pj1 .table>.piece:nth-child(2){scale:1.5}");
    expect(rest).toMatch(/@media \(min-width:900px\)\{[^@]*\.n-pj1 \.table>\.piece:nth-child\(2\)\{scale:initial\}/);
    expect(rest).toMatch(/@media \(min-width:1600px\)\{[^@]*\.n-pj1 \.table>\.piece:nth-child\(2\)\{scale:2\}/);
    expect(css).not.toContain("nth-child(1){scale");
    expect(css).not.toContain("nth-child(3){scale");
  });

  it("a desktop-only size leaves mobile and tablet alone, and counts the shown pieces", () => {
    const css = cssFor([{ ...pieces[0]!, hidden: true }, { ...pieces[1]!, size: { base: { scale: 1 }, desktop: { scale: 0.6 } } }]);
    const mobile = css.slice(0, css.lastIndexOf("@media (min-width:900px)"));
    expect(mobile).not.toContain(".n-pj1 .table>.piece");
    expect(css).toMatch(/@media \(min-width:900px\)\{[^@]*\.n-pj1 \.table>\.piece:nth-child\(1\)\{scale:0\.6\}/);
  });

  it("only takes sizes from 40% to 250%", () => {
    const ok = (scale: number) => AoostProjectsContent.safeParse({ ...d, projects: [{ image: "/a.png", size: { base: { scale } } }] }).success;
    expect([ok(0.4), ok(1), ok(2.5)]).toEqual([true, true, true]);
    expect([ok(0.3), ok(2.6)]).toEqual([false, false]);
  });
});

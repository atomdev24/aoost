import { describe, expect, it } from "vitest";
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
  it("can drop the note, the keychain and the intro", () => {
    const html = renderNode("AoostProjects", { ...d, intro: "", note: { show: false }, keychain: { ...d.keychain, show: false } });
    expect(html).not.toContain("who-row");
    expect(html).not.toContain("table-note");
    expect(html).not.toContain('id="keychain"');
  });
});

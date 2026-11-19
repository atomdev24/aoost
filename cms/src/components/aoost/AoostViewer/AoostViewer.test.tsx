import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";

describe("AoostViewer", () => {
  it("renders the dark room, closed, with its controls", () => {
    const html = renderNode("AoostViewer", {});
    expect(html).toContain('<div class="viewer" id="viewer" hidden="" role="dialog" aria-modal="true" aria-label="Artwork">');
    expect(html).toContain('<p class="vcount" id="vCount" aria-live="polite"></p>');
    expect(html).toMatch(/<button class="vbtn vclose" id="vClose" type="button" aria-label="Close">/);
    expect(html).toContain('id="vPrev"');
    expect(html).toContain('id="vNext"');
    expect(html).toContain('<div class="stage" id="vStage"></div>');
    expect(html).not.toContain("Nothing to edit");
  });
  it("shows no plaque or info button until a piece with plaque text opens", () => {
    const html = renderNode("AoostViewer", {});
    expect(html).toMatch(/<button class="vbtn vinfo" id="vInfo"[^>]* hidden>i<\/button>/);
    expect(html).toContain('<div class="vplaque" id="vPlaque" hidden></div>');
  });
  it("explains itself in the editor", () => {
    expect(renderNode("AoostViewer", {}, { editing: true })).toContain("Nothing to edit here");
  });
});

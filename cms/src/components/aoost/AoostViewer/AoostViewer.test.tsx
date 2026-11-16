import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";

describe("AoostViewer", () => {
  it("renders the original dialog, closed", () => {
    const html = renderNode("AoostViewer", {});
    expect(html).toContain('<div class="viewer" id="viewer" hidden="" role="dialog" aria-modal="true" aria-label="Artwork">');
    expect(html).toContain('<button class="btn vclose" id="vClose">close</button>');
    expect(html).toContain('<div class="stage" id="vStage"></div>');
    expect(html).not.toContain("Nothing to edit");
  });
  it("explains itself in the editor", () => {
    expect(renderNode("AoostViewer", {}, { editing: true })).toContain("Nothing to edit here");
  });
});

import { describe, expect, it } from "vitest";
import { TrueFruitSeason } from "./TrueFruitSeason";
import { renderNode } from "../test-utils";

const content = { ...TrueFruitSeason.defaults.content };

describe("TrueFruit by season", () => {
  it("renders the POC section with the fields, escaped, and ids unique to the block", () => {
    const html = renderNode("TrueFruitSeason", { ...content, sizeTitle: "Size <b>now</b>", sizeLink: "javascript:alert(1)" });
    expect(html).toContain('data-tfs=""');
    expect(html).toContain("Size &lt;b&gt;now&lt;/b&gt;");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('id="stage-size-t1"');
    expect(html).not.toContain("__UID__");
  });
  it("shows the chosen product with its charts drawn in the editor", () => {
    const html = renderNode("TrueFruitSeason", { ...content, previewStage: 2 }, { editing: true });
    expect(html).toContain('class="stage is-active" role="tabpanel" id="stage-binscan-t1"');
    expect(html).toContain("insights stage-visual is-shown");
    expect(html).toContain("tfs is-canvas");
  });
  it("leaves the dark photo panel when a photo is missing", () => {
    expect(renderNode("TrueFruitSeason", { ...content, gradePhoto: "" })).not.toContain('alt="Phone grading oranges');
  });
});

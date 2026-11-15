import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

describe("Spacer", () => {
  it("is invisible to assistive tech and only striped in the editor", () => {
    expect(renderNode("Spacer", {})).toBe('<div class="spacer" aria-hidden="true"></div>');
    expect(renderNode("Spacer", {}, { editing: true })).toContain("spacer-edit");
  });
});

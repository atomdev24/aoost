import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroPageHeader } from "./AeroPageHeader";

describe("AeroPageHeader", () => {
  it("shows the title and intro", () => {
    const html = renderNode("AeroPageHeader", { ...AeroPageHeader.defaults.content });
    expect(html).toContain('<h1 class="ab-h1">Request a demo</h1>');
  });
});

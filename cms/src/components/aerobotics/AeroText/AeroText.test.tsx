import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroText } from "./AeroText";

describe("AeroText", () => {
  it("splits paragraphs at blank lines and keeps links", () => {
    const html = renderNode("AeroText", { ...AeroText.defaults.content, body: "One\n\nTwo with [careers](https://aerobotics.com/careers)" });
    expect(html.match(/class="abx-p"/g)).toHaveLength(2);
    expect(html).toContain('href="https://aerobotics.com/careers"');
  });
});

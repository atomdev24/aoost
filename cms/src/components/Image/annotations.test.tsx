import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

const base = { src: "/media/a.jpg", alt: "Citrus", width: 800, height: 600 };
const marks = [
  { x: 20, y: 30, r: 8, size: 68, colour: "break", side: "right" },
  { x: 80, y: 40, r: 6, size: 72, colour: "green", side: "left" },
];

describe("fruit readings on a picture", () => {
  it("draws each mark with its size and colour, ready to play in", () => {
    const html = renderNode("Image", { ...base, marks, markStyle: "brackets" });
    expect(html).toContain('class="ann ann-brackets"');
    expect(html).toContain('data-count="68"');
    expect(html).toContain("Colour break");
    expect(html).toContain("ann-left");
    expect(html).toContain("left:20%;top:30%");
  });
  it("shows them settled and draggable in the editor", () => {
    expect(renderNode("Image", { ...base, marks }, { editing: true })).toContain('class="ann ann-ring in ann-edit"');
  });
  it("draws nothing without marks", () => {
    expect(renderNode("Image", base)).not.toContain("ann");
  });
});

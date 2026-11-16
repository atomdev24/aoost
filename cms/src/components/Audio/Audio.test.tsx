import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

describe("Audio", () => {
  it("renders a native player that loads nothing until played", () => {
    const html = renderNode("Audio", { src: "/media/2026/a.mp3", title: "Desert static", artist: "aoost" });
    expect(html).toContain('<audio controls="" preload="none" src="/media/2026/a.mp3" aria-label="Desert static">');
    expect(html).toContain("Desert static");
    expect(html).toContain("aoost");
  });
  it("is empty without a file", () => {
    expect(renderNode("Audio", { src: "", title: "x" })).toBe("");
  });
});

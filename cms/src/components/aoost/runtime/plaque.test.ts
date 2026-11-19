import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS runtime module
import { hasPlaque, plaqueParts } from "./plaque.js";

describe("viewer plaque", () => {
  it("is absent without plaque text", () => {
    for (const p of [undefined, null, {}, { title: "  " }, { tags: ["ink"] }, { link: "javascript:alert(1)" }]) {
      expect(hasPlaque(p)).toBe(false);
      expect(plaqueParts(p)).toBeNull();
    }
  });
  it("is present when any one field is set", () => {
    for (const p of [{ title: "Blue monkey" }, { medium: "Ink" }, { year: "2025" }, { note: "Made on a train" }, { link: "https://example.com" }]) expect(hasPlaque(p)).toBe(true);
  });
  it("shows the title, then medium and year, then the note", () => {
    expect(plaqueParts({ title: "Blue monkey", medium: "Ink", year: "2025", note: "A note" })).toEqual({ title: "Blue monkey", meta: "Ink, 2025", note: "A note", link: "" });
    expect(plaqueParts({ year: "2025" })!.meta).toBe("2025");
  });
  it("drops unsafe links", () => {
    expect(plaqueParts({ title: "x", link: "javascript:alert(1)" })!.link).toBe("");
    expect(plaqueParts({ title: "x", link: "/work" })!.link).toBe("/work");
  });
});

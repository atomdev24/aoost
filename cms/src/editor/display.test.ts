import { describe, expect, it } from "vitest";
import { THEMES, themeFrom } from "./display";

describe("editor colour themes", () => {
  it("reads saved values and falls back to Graphite", () => {
    expect(themeFrom("ink")).toBe("ink");
    expect(themeFrom("paper")).toBe("paper");
    expect(themeFrom("graphite")).toBe("graphite");
    expect(themeFrom(null)).toBe("graphite");
    expect(themeFrom("neon")).toBe("graphite");
  });
  it("offers Graphite first, then Ink and Paper at night", () => {
    expect(THEMES.map((t) => t.id)).toEqual(["graphite", "ink", "paper"]);
  });
});

import { describe, expect, it } from "vitest";
import { defaultMode } from "./mode-default";

describe("Simple / Full", () => {
  it("starts Owners in Full and everyone else in Simple", () => {
    expect(defaultMode("owner")).toBe("full");
    for (const r of ["manager", "editor", "viewer"]) expect(defaultMode(r)).toBe("simple");
  });
});

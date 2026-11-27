import { describe, expect, it } from "vitest";
import { glassStyleFrom } from "./display";

describe("toolbar glass setting", () => {
  it("reads the new setting, carries the old on/off over, and defaults to liquid", () => {
    expect(glassStyleFrom("frosted", null)).toBe("frosted");
    expect(glassStyleFrom("solid", "on")).toBe("solid");
    expect(glassStyleFrom(null, "off")).toBe("solid");
    expect(glassStyleFrom(null, "on")).toBe("liquid");
    expect(glassStyleFrom(null, null)).toBe("liquid");
    expect(glassStyleFrom("sparkly", null)).toBe("liquid");
  });
});

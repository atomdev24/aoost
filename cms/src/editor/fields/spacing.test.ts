import { describe, expect, it } from "vitest";
import { formatSpacing, parseLength, parseSpacing } from "./spacing";

describe("spacing shorthand", () => {
  it("splits one, two and four values into vertical and horizontal", () => {
    expect(parseSpacing("56px 20px")).toEqual({ v: 56, h: 20 });
    expect(parseSpacing("12px")).toEqual({ v: 12, h: 12 });
    expect(parseSpacing("8px 4px 8px 4px")).toEqual({ v: 8, h: 4 });
    expect(parseSpacing("0")).toEqual({ v: 0, h: 0 });
    expect(parseSpacing(undefined)).toEqual({ v: 0, h: 0 });
  });
  it("refuses values it can't edit as two numbers", () => {
    expect(parseSpacing("1px 2px 3px 4px")).toBeNull();
    expect(parseSpacing("2rem 1rem")).toBeNull();
  });
  it("writes the short form back", () => {
    expect(formatSpacing({ v: 10, h: 10 })).toBe("10px");
    expect(formatSpacing({ v: 56, h: 20 })).toBe("56px 20px");
  });
  it("splits lengths into number and unit", () => {
    expect(parseLength("320px")).toEqual({ n: 320, unit: "px" });
    expect(parseLength("50%")).toEqual({ n: 50, unit: "%" });
    expect(parseLength("auto")).toBeNull();
  });
});

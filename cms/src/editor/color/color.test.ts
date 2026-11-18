import { describe, expect, it } from "vitest";
import { formatColor, hsvToRgb, parseColor, parseFormatted, rgbToHsv, toHex } from "./color";

describe("colour maths", () => {
  it("parses hex, rgb and hsl", () => {
    expect(parseColor("#0A84FF")).toEqual({ r: 10, g: 132, b: 255, a: 1 });
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("rgba(20, 20, 20, .4)")).toEqual({ r: 20, g: 20, b: 20, a: 0.4 });
    expect(parseColor("rgb(10 132 255 / 50%)")?.a).toBe(0.5);
    expect(toHex(parseColor("hsl(0, 100%, 50%)")!)).toBe("#ff0000");
    expect(parseColor("token:ink")).toBeNull();
  });
  it("writes hex with alpha only when see-through", () => {
    expect(toHex({ r: 10, g: 132, b: 255, a: 1 })).toBe("#0a84ff");
    expect(toHex({ r: 10, g: 132, b: 255, a: 0.5 })).toBe("#0a84ff80");
  });
  it("round-trips through every format", () => {
    for (const hex of ["#0a84ff", "#141414", "#f3efe6", "#ff2d55", "#7f7f7f"]) {
      const c = parseColor(hex)!;
      for (const f of ["hex", "rgb", "hsl"] as const) {
        const back = parseFormatted(formatColor(c, f), f, 1)!;
        // HSL rounds to whole numbers, so allow one step per channel.
        expect(Math.abs(back.r - c.r) + Math.abs(back.g - c.g) + Math.abs(back.b - c.b)).toBeLessThanOrEqual(f === "hsl" ? 6 : 0);
      }
      expect(toHex({ ...hsvToRgb(rgbToHsv(c)), a: 1 })).toBe(hex);
    }
  });
});

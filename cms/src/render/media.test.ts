import { describe, expect, it } from "vitest";
import { phoneVariant } from "./media";

describe("phoneVariant", () => {
  it("picks the 960 px copy when there is one", () => {
    expect(phoneVariant("/art/shadow-window-sun.webp")).toBe("/art/shadow-window-sun.960.webp");
    expect(phoneVariant("/media/2026/a.jpg")).toBe("/media/2026/a.jpg?w=960");
    expect(phoneVariant("/art/x.960.webp")).toBe("/art/x.960.webp");
    expect(phoneVariant("/art/logo.svg")).toBe("/art/logo.svg");
    expect(phoneVariant("https://x.com/a.jpg")).toBe("https://x.com/a.jpg");
  });
});

import { describe, expect, it } from "vitest";
import { pictureName } from "./names";

describe("pictureName", () => {
  it("turns a file address into words", () => {
    expect(pictureName("/media/2026/hear-no-evil_3D-v2.png?w=480")).toBe("Hear no evil 3D v2");
    expect(pictureName("monkey-figure.jpg")).toBe("Monkey figure");
    expect(pictureName("/m/flower%20skull.webp")).toBe("Flower skull");
  });
  it("copes with nothing and odd names", () => {
    expect(pictureName(undefined)).toBe("");
    expect(pictureName("/m/.png")).toBe(".png");
    expect(pictureName("https://x.com/a/b/")).toBe("B");
  });
});

import { describe, expect, it } from "vitest";
import { tagName, versionCounts, versionKey } from "./media-names";

describe("media names", () => {
  it("tags a thumbnail with a short file name", () => {
    expect(tagName("orchard-hero.jpg")).toBe("orchard-hero");
    expect(tagName("orchard-hero.a1b2c3d4e5.webp")).toBe("orchard-hero");
  });
  it("groups versions of one picture", () => {
    expect(versionKey("orchard-hero-mobile.jpg")).toBe("orchard-hero");
    expect(versionKey("Orchard-Hero-v2.png")).toBe("orchard-hero");
    expect(versionKey("orchard-hero (1).jpg")).toBe("orchard-hero");
    expect(versionKey("drone-scan.jpg")).toBe("drone-scan");
    expect(versionCounts(["a-v1.jpg", "a-v2.jpg", "a-dark.jpg", "b.jpg"]).get("a")).toBe(3);
  });
});

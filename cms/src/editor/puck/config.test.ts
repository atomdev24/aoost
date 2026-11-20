// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { puckConfig } from "./config";

const order = (type: string) => Object.keys(puckConfig.components[type]?.fields ?? {});

describe("inspector order", () => {
  it.each(["Text", "Image", "Button", "Video"])("%s shows Content before Layout", (type) => {
    const keys = order(type);
    expect(keys[0]).toBe("__content");
    expect(keys.indexOf("__content")).toBeLessThan(keys.indexOf("style"));
    expect(keys.indexOf("style")).toBeLessThan(keys.indexOf("effects"));
    expect(keys.at(-1)).toBe("name");
  });
  it("a block with no content starts at Layout", () => {
    expect(order("Spacer")[0]).toBe("style");
  });
});

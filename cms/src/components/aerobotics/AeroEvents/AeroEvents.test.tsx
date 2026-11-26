import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroEvents } from "./AeroEvents";

describe("AeroEvents", () => {
  it("lists the events with their dates", () => {
    const html = renderNode("AeroEvents", { ...AeroEvents.defaults.content });
    expect(html).toContain("Fruit Logistica");
    expect(html).toContain("3-5 Feb 2027, Berlin");
    expect(html).toContain("Book a meeting");
  });
});

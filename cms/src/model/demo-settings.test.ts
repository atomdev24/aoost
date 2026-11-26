import { describe, expect, it } from "vitest";
import { cleanDemoSettings, resetsTonight } from "./demo-settings";

describe("demo settings", () => {
  it("cleans input, defaulting to on and nightly", () => {
    expect(cleanDemoSettings(null)).toEqual({ enabled: true, reset: "nightly" });
    expect(cleanDemoSettings({ enabled: false, reset: "weekly", x: 1 })).toEqual({ enabled: false, reset: "weekly" });
    expect(cleanDemoSettings({ reset: "hourly" }).reset).toBe("nightly");
  });
  it("resets every night, on Mondays (Cape Town) or never", () => {
    const mon = new Date("2026-11-30T01:00:00Z"); // 03:00 Monday in Cape Town
    const tue = new Date("2026-12-01T01:00:00Z");
    expect(resetsTonight({ enabled: true, reset: "nightly" }, tue)).toBe(true);
    expect(resetsTonight({ enabled: true, reset: "weekly" }, mon)).toBe(true);
    expect(resetsTonight({ enabled: true, reset: "weekly" }, tue)).toBe(false);
    expect(resetsTonight({ enabled: true, reset: "never" }, mon)).toBe(false);
  });
});

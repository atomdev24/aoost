import { describe, expect, it } from "vitest";
import { dayLabel, initials } from "./history-format";

describe("history formatting", () => {
  const now = new Date("2026-11-26T10:00:00");
  it("groups by Today, Yesterday, then the date", () => {
    expect(dayLabel("2026-11-26T08:00:00", now)).toBe("Today");
    expect(dayLabel("2026-11-25T08:00:00", now)).toBe("Yesterday");
    expect(dayLabel("2026-11-20T08:00:00", now)).toMatch(/20/);
  });
  it("makes initials from a name or an email", () => {
    expect(initials("Alex Oostendurp")).toBe("AO");
    expect(initials("alex@aerobotics.com")).toBe("A");
    expect(initials("jess.miller@x.com")).toBe("JM");
    expect(initials(null)).toBe("·");
  });
});

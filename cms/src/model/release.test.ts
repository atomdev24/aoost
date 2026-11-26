import { describe, expect, it } from "vitest";
import { checkSchedule, releaseAction, type Release } from "./release";

const base: Release = { label: "Berlin", goLiveAt: 1000, state: "scheduled", by: "alex" };

describe("releases", () => {
  it("goes live when due, ends when its end time comes, and otherwise waits", () => {
    expect(releaseAction(base, 999)).toBe(null);
    expect(releaseAction(base, 1000)).toBe("push");
    expect(releaseAction({ ...base, state: "live", endAt: 5000 }, 4000)).toBe(null);
    expect(releaseAction({ ...base, state: "live", endAt: 5000 }, 5000)).toBe("end");
    expect(releaseAction({ ...base, state: "live" }, 9e12)).toBe(null);
    expect(releaseAction({ ...base, state: "blocked" }, 9e12)).toBe(null);
    expect(releaseAction(null, 1)).toBe(null);
  });
  it("checks the times from the editor", () => {
    const now = 1_000_000;
    expect(checkSchedule(now + 10, undefined, now)).toEqual({ goLiveAt: now + 10 });
    expect(checkSchedule(now + 10, now + 20, now)).toEqual({ goLiveAt: now + 10, endAt: now + 20 });
    expect(checkSchedule(now - 120_000, undefined, now)).toMatch(/passed/);
    expect(checkSchedule(now + 10, now + 5, now)).toMatch(/after/);
    expect(checkSchedule("x", undefined, now)).toMatch(/Choose/);
  });
});

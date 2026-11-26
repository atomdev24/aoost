import { describe, expect, it } from "vitest";
import { expiries, isExpired, kindOf } from "./page-kinds";

describe("page kinds", () => {
  it("defaults to an ordinary page", () => expect(kindOf({})).toBe("page"));
  it("takes a campaign down after its unpublish day, not on it", () => {
    const c = { kind: "campaign" as const, unpublishAt: "2026-12-01" };
    expect(isExpired(c, "2026-12-01")).toBe(false);
    expect(isExpired(c, "2026-12-02")).toBe(true);
    expect(isExpired({ kind: "page" as const, unpublishAt: "2020-01-01" }, "2026-12-02")).toBe(false);
  });
  it("lists live campaign expiries by address", () => {
    const site = { pages: [{ slug: "/expo", kind: "campaign", unpublishAt: "2026-12-01", status: "unlisted" }, { slug: "/x", kind: "campaign", unpublishAt: "2026-12-01", status: "draft" }] } as never;
    expect(expiries(site)).toEqual({ "/expo": "2026-12-01" });
  });
});

import { describe, expect, it } from "vitest";
import { clarityIdFrom, devices, pathOf, summarise, type InsightsDay } from "./insights";

const day = (date: string, sessions: Record<string, number>, extra: InsightsDay["url"] = []): InsightsDay => ({
  date,
  at: 0,
  url: [{ metricName: "Traffic", information: Object.entries(sessions).map(([URL, n]) => ({ totalSessionCount: String(n), URL })) }, ...(extra ?? [])],
  device: [{ metricName: "Traffic", information: [{ totalSessionCount: "3", Device: "Mobile" }, { totalSessionCount: "1", Device: "PC" }] }],
});

describe("visitor insights", () => {
  it("reads paths from Clarity's URLs", () => {
    expect(pathOf("https://alexoostendurp.com/work/?x=1#a")).toBe("/work");
    expect(pathOf("https://alexoostendurp.com")).toBe("/");
    expect(pathOf(42)).toBeNull();
  });

  it("sums pages over days, with a trend and the other metrics when present", () => {
    const rows = summarise([
      day("2026-11-25", { "https://a.com/": 4, "https://a.com/work": 2 }, [
        { metricName: "Scroll Depth", information: [{ URL: "https://a.com/", averageScrollDepth: 60 }] },
        { metricName: "Rage Click Count", information: [{ URL: "https://a.com/", subTotal: "2" }] },
        { metricName: "Something new", information: [{ URL: "https://a.com/", x: 1 }] },
      ]),
      day("2026-11-24", { "https://a.com/": 1 }, [{ metricName: "Scroll Depth", information: [{ URL: "https://a.com/", averageScrollDepth: "40" }] }]),
    ]);
    expect(rows[0]).toMatchObject({ path: "/", sessions: 5, scroll: 50, rageClicks: 2, trend: [1, 4] });
    expect(rows[1]).toMatchObject({ path: "/work", sessions: 2, scroll: null, activeTime: null, trend: [0, 2] });
  });

  it("splits visits by device", () => {
    expect(devices([day("d", {}), day("e", {})])).toEqual([
      { device: "Mobile", sessions: 6 },
      { device: "PC", sessions: 2 },
    ]);
  });

  it("takes a project ID or a link to the project", () => {
    expect(clarityIdFrom("zju5sls37v")).toBe("zju5sls37v");
    expect(clarityIdFrom("https://clarity.microsoft.com/projects/view/zju5sls37v/gettingstarted")).toBe("zju5sls37v");
    expect(clarityIdFrom("<script>")).toBeNull();
  });
});

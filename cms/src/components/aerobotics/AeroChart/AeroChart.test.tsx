import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { SAMPLE_CHARTS } from "../charts";
import { AeroChart } from "./AeroChart";

describe("AeroChart", () => {
  it("draws one bar per value with its label", () => {
    const html = renderNode("AeroChart", { ...AeroChart.defaults.content });
    expect(html).toContain("Count 72");
    expect(html).toContain("30%");
    expect(html).toContain("<rect");
  });
});

describe("AeroChart animation", () => {
  it("animates by default: marked for the site script on the live page", () => {
    const html = renderNode("AeroChart", { ...SAMPLE_CHARTS.bars });
    expect(html).toContain("abg-anim");
    expect(html).toContain("data-animate");
    expect(html).toContain("--abg-dur:1.2s");
  });
  it("can be switched off", () => {
    const html = renderNode("AeroChart", { ...SAMPLE_CHARTS.lines, animate: false });
    expect(html).not.toContain("abg-anim");
    expect(html).not.toContain("data-animate");
  });
  it("takes its own timing", () => {
    expect(renderNode("AeroChart", { ...SAMPLE_CHARTS.bars, animateSeconds: 2, animateDelay: 0.5 })).toContain("--abg-delay:0.5s");
  });
});

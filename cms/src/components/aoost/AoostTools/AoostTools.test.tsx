import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AoostTools } from "./AoostTools";

const d = AoostTools.defaults.content;

describe("AoostTools", () => {
  it("keeps the original markup, heading and the six live tools", () => {
    const html = renderNode("AoostTools", d);
    expect(html).toContain('<section class="focus-sec skills" aria-labelledby="h-tools">');
    expect(html).toContain('<h2 id="h-tools" data-underline="2">skills</h2>');
    expect(d.tools.map((t) => `${t.abbr} ${t.name} ${t.level} ${t.value}`)).toEqual(["Id InDesign Daily 90", "Ai Illustrator Fluent 85", "Ps Photoshop Daily 75", "Fg Figma Fluent 60", "Ae After Effects Learning 45", "Bl Blender Learning 35"]);
    expect(html).toContain('<li><span class="sk-ic" aria-hidden="true">Id</span><div class="sk-main"><div class="sk-top"><b>InDesign</b><span class="sk-lv">Daily</span></div><div class="sk-bar" role="meter" aria-label="InDesign proficiency" aria-valuemin="0" aria-valuemax="100" aria-valuenow="90" aria-valuetext="Daily"><i style="--v:0.9"></i></div></div></li>');
  });
  it("shows the bars already grown in the editor", () => {
    expect(renderNode("AoostTools", d, { editing: true })).toContain('class="focus-sec skills seen"');
  });
  it("renders whatever tools the fields hold", () => {
    const html = renderNode("AoostTools", { ...d, heading: "tools", tools: [{ abbr: "Pr", name: "Procreate", level: "Daily", value: 100 }] });
    expect(html).toContain(">tools</h2>");
    expect(html.match(/<li>/g)).toHaveLength(1);
    expect(html).toContain("--v:1");
  });
});

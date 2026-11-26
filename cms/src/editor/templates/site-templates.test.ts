import { describe, expect, it } from "vitest";
import { getComponent } from "../../components/registry";
import { Section } from "../../schema";
import { AEROBOTICS_TEMPLATES } from "./aerobotics-templates";
import { SITE_TEMPLATES } from "./site-templates";

describe("page templates", () => {
  for (const t of SITE_TEMPLATES) {
    it(`${t.name}: uses the real nav, valid sections and no dead links`, () => {
      expect(t.hideNav).toBe(false);
      expect(t.nav).toBe("aerobotics");
      const sections = t.sections();
      for (const s of sections) expect(Section.safeParse(s).success, `${t.name} › ${s.name}`).toBe(true);
      for (const n of sections.flatMap((s) => s.children)) expect(getComponent(n.type)?.schema.safeParse(n.content).success, `${t.name} › ${n.type}`).toBe(true);
      expect(sections.map((s) => s.name)).not.toContain("Top bar");
      const json = JSON.stringify(sections);
      expect(json).not.toMatch(/"(url|primaryUrl|secondaryUrl|buttonUrl)":"#"/);
      if (t.id.startsWith("aero-brochures")) expect(json.match(/drive\.google\.com\/file\/d\//g)).toHaveLength(5);
    });
  }
  it("makes fresh ids each time, so a template can be used twice on one site", () => {
    const [a, b] = [AEROBOTICS_TEMPLATES[0]!.sections(), AEROBOTICS_TEMPLATES[0]!.sections()];
    expect(a[0]!.id).not.toBe(b[0]!.id);
    expect(a[0]!.children[0]!.id).not.toBe(b[0]!.children[0]!.id);
  });
  it("gives each Aerobotics band its own edge-to-edge section and a name in Layers", () => {
    for (const t of AEROBOTICS_TEMPLATES)
      for (const s of t.sections()) {
        expect(s.name, t.name).toBeTruthy();
        if (s.children.length === 1 && getComponent(s.children[0]!.type)?.fullBleed) expect(s.layout.base.padding, `${t.name} › ${s.name}`).toBe("0px");
      }
  });
  it("lists nine Aerobotics pages before the brochure designs", () => {
    expect(SITE_TEMPLATES.map((t) => t.id).slice(0, 9)).toEqual(AEROBOTICS_TEMPLATES.map((t) => t.id));
    expect(AEROBOTICS_TEMPLATES).toHaveLength(9);
  });
});

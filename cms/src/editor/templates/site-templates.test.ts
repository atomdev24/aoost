import { describe, expect, it } from "vitest";
import { SITE_TEMPLATES } from "./site-templates";

describe("Aerobotics brochure templates", () => {
  for (const t of SITE_TEMPLATES) {
    it(`${t.name}: uses the real nav and has no dead links`, () => {
      expect(t.hideNav).toBe(false);
      expect(t.nav).toBe("aerobotics");
      const sections = t.sections();
      expect(sections.map((s) => s.name)).not.toContain("Top bar");
      const json = JSON.stringify(sections);
      expect(json).not.toMatch(/"(url|primaryUrl|secondaryUrl)":"#"/);
      expect(json.match(/drive\.google\.com\/file\/d\//g)).toHaveLength(5);
    });
  }
});

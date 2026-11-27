import { describe, expect, it } from "vitest";
import { validateSite } from "../schema";
import { demoSite } from "./site";
import { unsafeForDemo } from "./safety";

describe("demo site", () => {
  it("is a valid site", () => {
    const r = validateSite(demoSite());
    expect(r.ok ? [] : r.issues).toEqual([]);
  });
  it("carries none of the real site's art or brand (the Aerobotics pictures are fine)", () => {
    const text = JSON.stringify(demoSite());
    expect(text).not.toMatch(/\/art\/(?!(tpl_)?aero_)|Oostendurp|aoost|Facile/i);
    expect(text).toMatch(/\/art\/aero_/);
    expect(demoSite().nav.showLogoMark).toBe(false);
  });
  it("allows sandboxed code and refuses code that runs on the page", () => {
    expect(unsafeForDemo(demoSite())).toBeNull();
    const withCode = (mode: string) => ({ ...demoSite(), pages: [{ ...demoSite().pages[0]!, sections: [{ ...demoSite().pages[0]!.sections[0]!, children: [{ id: "c", type: "Code", content: { mode, html: "<b>x</b>" }, style: { base: {} } }] }] }] });
    expect(unsafeForDemo(withCode("sandboxed"))).toBeNull();
    expect(unsafeForDemo(withCode("inline"))).toMatch(/demo/);
  });
  it("starts with the two example collections, with stable ids and their page designs", () => {
    expect(demoSite().cms.map((c) => c.name)).toEqual(["Success stories", "Events"]);
    for (const c of demoSite().cms) expect(demoSite().pages.find((p) => p.id === c.pageId)?.collectionId).toBe(c.id);
    expect(demoSite().cms[0]!.items[0]!.id).toBe("i_table-grape-growers-south-africa");
    expect(JSON.stringify(demoSite())).not.toMatch(/"n_[a-z0-9]{6,}"|"s_[a-z0-9]{6,}"/);
  });
});

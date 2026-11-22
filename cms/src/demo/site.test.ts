import { describe, expect, it } from "vitest";
import { validateSite } from "../schema";
import { demoSite } from "./site";
import { unsafeForDemo } from "./safety";

describe("demo site", () => {
  it("is a valid site", () => {
    const r = validateSite(demoSite);
    expect(r.ok ? [] : r.issues).toEqual([]);
  });
  it("carries none of the real site's art or brand", () => {
    const text = JSON.stringify(demoSite);
    expect(text).not.toMatch(/\/art\/|Oostendurp|aoost|Facile/i);
    expect(demoSite.nav.showLogoMark).toBe(false);
  });
  it("allows sandboxed code and refuses code that runs on the page", () => {
    expect(unsafeForDemo(demoSite)).toBeNull();
    const withCode = (mode: string) => ({ ...demoSite, pages: [{ ...demoSite.pages[0]!, sections: [{ ...demoSite.pages[0]!.sections[0]!, children: [{ id: "c", type: "Code", content: { mode, html: "<b>x</b>" }, style: { base: {} } }] }] }] });
    expect(unsafeForDemo(withCode("sandboxed"))).toBeNull();
    expect(unsafeForDemo(withCode("inline"))).toMatch(/demo/);
  });
});

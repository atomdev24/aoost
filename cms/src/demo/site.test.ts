import { describe, expect, it } from "vitest";
import { validateSite } from "../schema";
import { demoSite } from "./site";
import { unsafeForDemo } from "./safety";

describe("demo site", () => {
  it("is a valid site", () => {
    const r = validateSite(demoSite);
    expect(r.ok ? [] : r.issues).toEqual([]);
  });
  it("carries none of the real site's art or brand (Aerobotics pictures are fine)", () => {
    const text = JSON.stringify(demoSite);
    expect(text).not.toMatch(/\/art\/(?!aero_|tpl_aero_)|Oostendurp|aoost|Facile/i);
    expect(demoSite.nav.showLogoMark).toBe(false);
  });
  it("is the Aerobotics site: home plus one page per page type, the old sample pages gone, the nav pointing at them", () => {
    const ids = demoSite.pages.map((p) => p.id);
    expect(ids).toEqual(["home", "true-fruit-size", "pricing", "about-us", "careers", "contact-us", "request-a-demo", "drone-partners", "interpoma-2026"]);
    expect(ids).not.toContain("work");
    expect(demoSite.pages.find((p) => p.id === "interpoma-2026")!.kind).toBe("campaign");
    // the same pages every time it's read (built once)
    expect(demoSite.pages[1]!.sections[0]!.id).toBe(demoSite.pages[1]!.sections[0]!.id);
    const pricing = demoSite.nav.items.find((i) => i.label === "Pricing")!;
    expect(pricing).toMatchObject({ type: "page", target: { kind: "page", pageId: "pricing" } });
    const size = demoSite.nav.items.find((i) => i.label === "Products")!.children!.find((c) => c.label === "TrueFruit Size")!;
    expect(size.target).toEqual({ kind: "page", pageId: "true-fruit-size" });
    expect(demoSite.nav.items.find((i) => i.label === "Request a demo")).toMatchObject({ type: "button", target: { kind: "page", pageId: "request-a-demo" } });
    // pages that don't exist in the demo keep their aerobotics.com link
    expect(demoSite.nav.items.find((i) => i.label === "Success stories")!.target).toMatchObject({ kind: "url" });
  });
  it("allows sandboxed code and refuses code that runs on the page", () => {
    expect(unsafeForDemo(demoSite)).toBeNull();
    const withCode = (mode: string) => ({ ...demoSite, pages: [{ ...demoSite.pages[0]!, sections: [{ ...demoSite.pages[0]!.sections[0]!, children: [{ id: "c", type: "Code", content: { mode, html: "<b>x</b>" }, style: { base: {} } }] }] }] });
    expect(unsafeForDemo(withCode("sandboxed"))).toBeNull();
    expect(unsafeForDemo(withCode("inline"))).toMatch(/demo/);
  });
});

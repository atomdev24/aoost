import { describe, expect, it } from "vitest";
import "../components/registry";
import { Site, validateSite } from "../schema";
import { seedSite } from "../seed/site";
import { detachGlobal, globalUses, insertTemplate, instantiate, makeGlobal, removeGlobal, removeTemplate, saveTemplate, STARTER_TEMPLATES, updateGlobal } from "./library";
import { locate } from "./page-ops";

const site = Site.parse(seedSite);
const page = (s: typeof site, id: string) => s.pages.find((p) => p.id === id)!;
const ok = (s: typeof site) => {
  const r = validateSite(s);
  return r.ok ? true : r.issues;
};

describe("global components", () => {
  it("ships a footer used on every page", () => {
    expect(globalUses(site, "footer")).toBe(site.pages.length);
  });
  it("edit once, update everywhere", () => {
    const next = updateGlobal(site, "footer", (n) => ({ ...n, content: { ...n.content, text: "New line" } }));
    expect(next.globals[0]!.node.content.text).toBe("New line");
    expect(next.pages).toBe(site.pages); // pages hold references, so none of them change
  });
  it("turns a node into a global and leaves a reference with the same placement", () => {
    const made = makeGlobal(site, "home", "home-cta", "Main button")!;
    const ref = (locate(page(made.site, "home"), "home-cta") as { node: { type: string; content: Record<string, unknown>; style: unknown } }).node;
    expect(ref).toMatchObject({ type: "Global", content: { globalId: made.globalId }, style: { base: { margin: "8px 0 0" } } });
    expect(made.site.globals.at(-1)).toMatchObject({ name: "Main button", node: { type: "Button", content: { label: "See the work" } } });
    expect(ok(made.site)).toBe(true);
    expect(makeGlobal(site, "home", "home-footer-ref", "x")).toBeNull();
  });
  it("detaches one reference into its own copy", () => {
    const next = detachGlobal(site, "about", "about-footer-ref");
    expect(locate(page(next, "about"), "about-footer-ref")).toMatchObject({ node: { type: "Footer", id: "about-footer-ref" } });
    expect(globalUses(next, "footer")).toBe(site.pages.length - 1);
    expect(ok(next)).toBe(true);
  });
  it("deleting a global keeps the content on every page", () => {
    const next = removeGlobal(site, "footer");
    expect(next.globals).toHaveLength(0);
    for (const p of next.pages) expect(p.sections.at(-1)!.children[0]!.type).toBe("Footer");
    expect(ok(next)).toBe(true);
  });
});

describe("templates", () => {
  it("has the four starters", () => {
    expect(site.templates.map((t) => t.id)).toEqual(STARTER_TEMPLATES);
    expect(site.templates.map((t) => t.name)).toEqual(["Blank", "Gallery", "Diary entry", "Playlist"]);
  });
  it("instantiates with fresh ids every time", () => {
    const a = instantiate(site.templates[1]!.sections);
    const b = instantiate(site.templates[1]!.sections);
    const idsOf = (s: typeof a) => s.flatMap((x) => [x.id, ...x.children.map((n) => n.id)]);
    expect(new Set([...idsOf(a), ...idsOf(b)]).size).toBe(idsOf(a).length * 2);
    expect(a[0]!.children[0]!.content).toEqual(site.templates[1]!.sections[0]!.children[0]!.content);
  });
  it("saves a section as a template and inserts it elsewhere", () => {
    const saved = saveTemplate(site, "section", "Lately strip", [page(site, "home").sections[2]!]);
    expect(saved.site.templates.at(-1)).toMatchObject({ name: "Lately strip", kind: "section" });
    const next = insertTemplate(saved.site, "about", saved.templateId, 1);
    const about = page(next, "about");
    expect(about.sections).toHaveLength(3);
    expect(about.sections[1]!.kind).toBe("grid");
    expect(about.sections[1]!.id).not.toBe("home-latest");
    expect(ok(next)).toBe(true);
  });
  it("saves a whole page as a template", () => {
    const saved = saveTemplate(site, "page", "", page(site, "work").sections);
    expect(saved.site.templates.at(-1)).toMatchObject({ kind: "page", name: "Page template" });
    expect(saved.site.templates.at(-1)!.sections).toHaveLength(3);
    expect(removeTemplate(saved.site, saved.templateId).templates).toHaveLength(4);
  });
});

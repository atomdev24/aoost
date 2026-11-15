import { describe, expect, it } from "vitest";
import { z } from "zod";
import "../components/registry";
import { locate } from "../model/page-ops";
import { Site, validateSite } from "../schema";
import { fixtureSite as seedSite } from "../seed/fixture";
import { runTool, tools, type ToolContext } from "./tools";

const site = Site.parse(seedSite);
const ctx = (editor: ToolContext["editor"] = null, s = site): ToolContext => ({ site: s, editor });
const open = (pageId: string, selected: string[] = [], breakpoint: "mobile" | "desktop" = "desktop") => ({ pageId, selectedNodeIds: selected, breakpoint, updatedAt: Date.now() });
const page = (s: typeof site, id: string) => s.pages.find((p) => p.id === id)!;
const nodeOf = (s: typeof site, pageId: string, id: string) => (locate(page(s, pageId), id) as { node: { content: Record<string, unknown>; style: { base: Record<string, unknown>; desktop?: Record<string, unknown> }; frame?: unknown } }).node;
const ok = (s: typeof site) => {
  const r = validateSite(s);
  return r.ok ? true : r.issues;
};

describe("MCP tool list", () => {
  it("has every tool from the spec, with JSON-schema inputs", () => {
    const names = tools.map((t) => t.name);
    for (const n of ["list_pages", "get_page", "get_site", "get_editor_context", "add_section", "update_node", "move_node", "delete_node", "set_responsive_override", "create_page", "update_page_settings", "update_nav", "upload_media_from_url", "get_preview_screenshot", "publish"]) expect(names).toContain(n);
    for (const t of tools) {
      const schema = z.toJSONSchema(t.input, { io: "input" }) as { type: string };
      expect(schema.type, t.name).toBe("object");
      expect(t.description.length, t.name).toBeGreaterThan(20);
    }
  });
  it("gates publish behind an explicit request in its description", () => {
    const d = tools.find((t) => t.name === "publish")!.description;
    expect(d).toMatch(/ONLY call this when Alex has explicitly asked/);
    expect(d).toMatch(/Never publish on your own initiative/);
  });
});

describe("read tools", () => {
  it("lists pages and reads one by id or URL", () => {
    expect(JSON.parse(runTool("list_pages", {}, ctx()).text)).toHaveLength(10);
    expect(JSON.parse(runTool("get_page", { page: "/work/digital" }, ctx()).text).id).toBe("digital");
    expect(runTool("get_page", { page: "ghost" }, ctx())).toMatchObject({ isError: true });
  });
  it("defaults to the page open in the editor", () => {
    expect(JSON.parse(runTool("get_page", {}, ctx(open("diary"))).text).id).toBe("diary");
    expect(JSON.parse(runTool("get_page", {}, ctx()).text).id).toBe("home");
  });
  it("describes the site, its tokens and the component catalogue", () => {
    const s = JSON.parse(runTool("get_site", {}, ctx()).text);
    expect(s.theme.colors.rust).toBe("#B5421A");
    expect(s.components.Image).toMatchObject({ framed: true });
    expect(s.nav.items).toHaveLength(6);
  });
  it("reports the editor's page, selection and breakpoint", () => {
    const c = JSON.parse(runTool("get_editor_context", {}, ctx(open("home", ["home-photo"], "mobile"))).text);
    expect(c).toMatchObject({ page: { id: "home" }, breakpoint: "mobile", selected: [{ id: "home-photo", type: "Image", inSection: "home-art" }] });
    expect(runTool("get_editor_context", {}, ctx()).text).toMatch(/not open/);
  });
});

describe("editing tools", () => {
  it("adds a section with nodes before the footer", () => {
    const r = runTool("add_section", { page: "about", kind: "grid", name: "Press", desktop_layout: { columns: 2 }, nodes: [{ type: "Text", content: { text: "Hello", styleId: "h2", tag: "h2" } }, { type: "Image", content: { src: "/art/hero.jpg", alt: "Hero" }, style: { aspectRatio: "4/3" }, desktop_style: { colSpan: 2 } }] }, ctx());
    const about = page(r.site!, "about");
    expect(about.sections.map((s) => s.name)).toEqual(["Content", "Press", "Footer"]);
    expect(about.sections[1]).toMatchObject({ kind: "grid", layout: { desktop: { columns: 2 } } });
    expect(about.sections[1]!.children[1]).toMatchObject({ type: "Image", content: { src: "/art/hero.jpg", lightbox: true }, style: { base: { aspectRatio: "4/3" }, desktop: { colSpan: 2 } } });
    expect(r.changed).toEqual([about.sections[1]!.id]);
    expect(ok(r.site!)).toBe(true);
  });
  it("rejects unknown components and bad content", () => {
    expect(runTool("add_section", { kind: "flow", nodes: [{ type: "Carousel" }] }, ctx())).toMatchObject({ isError: true });
    expect(runTool("add_node", { section_id: "home-hero", node: { type: "Button", content: { label: "" } } }, ctx())).toMatchObject({ isError: true });
    expect(runTool("add_section", { kind: "table" }, ctx())).toMatchObject({ isError: true, text: expect.stringContaining("Invalid arguments") });
  });
  it("updates the selected node's content and mobile style, finding it from the editor context", () => {
    const r = runTool("update_node", { node_id: "home-photo", content: { alt: "Blue monkey" }, style: { radius: [40, 40, 40, 40] } }, ctx(open("home", ["home-photo"])));
    const n = nodeOf(r.site!, "home", "home-photo");
    expect(n.content).toMatchObject({ alt: "Blue monkey", src: "/art/hero.jpg" });
    expect(n.style.base.radius).toEqual([40, 40, 40, 40]);
    expect(n.style.desktop).toEqual(site.pages[0]!.sections[1]!.children[1]!.style.desktop); // desktop overrides untouched
    expect(r.changed).toEqual(["home-photo"]);
  });
  it("updates a global component everywhere", () => {
    const r = runTool("update_node", { node_id: "footer", content: { text: "New footer" } }, ctx());
    expect(r.site!.globals[0]!.node.content.text).toBe("New footer");
    expect(r.site!.pages).toBe(site.pages);
  });
  it("sets and resets desktop overrides", () => {
    const set = runTool("set_responsive_override", { node_id: "home-title", breakpoint: "desktop", style: { maxWidth: "720px", textAlign: "center" } }, ctx());
    expect(nodeOf(set.site!, "home", "home-title").style).toEqual({ base: {}, desktop: { maxWidth: "720px", textAlign: "center" } });
    const reset = runTool("set_responsive_override", { node_id: "home-title", breakpoint: "desktop", style: { maxWidth: null } }, ctx(null, set.site!));
    expect(nodeOf(reset.site!, "home", "home-title").style).toEqual({ base: {}, desktop: { textAlign: "center" } });
    const section = runTool("set_responsive_override", { node_id: "home-latest", breakpoint: "desktop", layout: { columns: 4 } }, ctx());
    expect(page(section.site!, "home").sections[2]!.layout.desktop).toMatchObject({ columns: 4 });
    expect(runTool("set_responsive_override", { node_id: "home-title", breakpoint: "desktop", style: { width: "wide" } }, ctx())).toMatchObject({ isError: true });
  });
  it("moves and deletes", () => {
    const moved = runTool("move_node", { node_id: "home-cta", to_section_id: "home-latest", index: 0 }, ctx());
    expect(page(moved.site!, "home").sections[2]!.children[0]!.id).toBe("home-cta");
    const up = runTool("move_node", { node_id: "home-latest", index: 0 }, ctx());
    expect(page(up.site!, "home").sections[0]!.id).toBe("home-latest");
    const gone = runTool("delete_node", { node_id: "home-art" }, ctx());
    expect(page(gone.site!, "home").sections.map((s) => s.id)).not.toContain("home-art");
    expect(runTool("delete_node", { node_id: "nope" }, ctx())).toMatchObject({ isError: true });
  });
  it("creates pages and changes their settings, with redirects", () => {
    const made = runTool("create_page", { name: "Sketchbook", template: "gallery", parent: "work" }, ctx());
    expect(JSON.parse(made.text)).toMatchObject({ url: "/work/sketchbook", status: "draft" });
    const updated = runTool("update_page_settings", { page: "about", title: "Bio", slug: "bio", status: "unlisted", seo: { description: "Who is Alex" } }, ctx());
    expect(page(updated.site!, "about")).toMatchObject({ title: "Bio", slug: "/bio", status: "unlisted", seo: { description: "Who is Alex" } });
    expect(updated.site!.redirects).toEqual([{ from: "/about", to: "/bio" }]);
    expect(ok(updated.site!)).toBe(true);
  });
  it("edits the navigation", () => {
    const r = runTool("update_nav", { add: { type: "button", label: "Say howdy", target: { kind: "email", email: "a@b.co" } }, update: { id: "nav-diary", badge: { text: "New", expires: "2026-12-01" }, hover: "underline" }, remove: "nav-rodeo", behaviour: { current_marker: "underline" } }, ctx());
    const nav = r.site!.nav;
    expect(nav.currentMarker).toBe("underline");
    expect(nav.items.map((i) => i.id)).not.toContain("nav-rodeo");
    expect(nav.items.find((i) => i.id === "nav-diary")).toMatchObject({ badge: { text: "New" }, hover: "underline" });
    expect(nav.items.at(-1)).toMatchObject({ type: "button", label: "Say howdy", target: { kind: "email" } });
    expect(ok(r.site!)).toBe(true);
    expect(runTool("update_nav", {}, ctx())).toMatchObject({ isError: true });
  });
  it("leaves side-effect tools to the server", () => {
    for (const name of ["publish", "upload_media_from_url", "get_preview_screenshot"]) expect(tools.find((t) => t.name === name)!.run).toBeUndefined();
  });
});

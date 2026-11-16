import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import "../components/registry";
import { makeCtx } from "../render/context";
import { pageCss } from "../render/document";
import { navRenderer } from "../render/nav";
import { NAV_ITEM_TYPES, Site, validateSite } from "../schema";
import { fixtureSite as seedSite } from "../seed/fixture";
import { addNavItem, findNavItem, moveNavItem, NAV_TYPE_LABELS, removeNavItem, setNavBehaviour, updateNavItem } from "./nav";

const site = Site.parse(seedSite);
const ids = (s: typeof site) => s.nav.items.map((i) => i.id);
const valid = (s: typeof site) => {
  const r = validateSite(s);
  return r.ok ? true : r.issues;
};
const render = (s: typeof site, pageId = "home") => {
  const Nav = navRenderer(s.nav.style).Render;
  return renderToStaticMarkup(<Nav ctx={makeCtx(s, s.pages.find((p) => p.id === pageId)!)} />);
};

/** A nav with one of every item type. */
function everything() {
  let s = site;
  const made: Record<string, string> = {};
  for (const type of NAV_ITEM_TYPES) {
    const r = addNavItem(s, type);
    s = r.site;
    made[type] = r.itemId;
  }
  return { site: s, made };
}

describe("nav editing", () => {
  it("offers exactly the ten item types", () => {
    expect(Object.keys(NAV_TYPE_LABELS)).toEqual([...NAV_ITEM_TYPES]);
    expect(NAV_ITEM_TYPES).toHaveLength(10);
  });
  it("adds every type with valid defaults", () => {
    const { site: s, made } = everything();
    expect(valid(s)).toBe(true);
    expect(findNavItem(s.nav.items, made.mega!)!.panel![0]!.kind).toBe("grid");
    expect(findNavItem(s.nav.items, made.section!)!.target).toMatchObject({ kind: "section", pageId: "home" });
  });
  it("updates settings and clears empty ones", () => {
    const s = updateNavItem(site, "nav-diary", { label: "Journal", badge: { text: "New", expires: "2026-11-30" }, showOn: "desktop", hover: "underline", ariaLabel: "The diary" });
    expect(findNavItem(s.nav.items, "nav-diary")).toMatchObject({ label: "Journal", badge: { text: "New" }, showOn: "desktop", hover: "underline" });
    const cleared = updateNavItem(s, "nav-diary", { label: "", badge: undefined });
    expect(findNavItem(cleared.nav.items, "nav-diary")).not.toHaveProperty("label");
    expect(findNavItem(cleared.nav.items, "nav-diary")).not.toHaveProperty("badge");
    expect(valid(cleared)).toBe(true);
  });
  it("reorders and removes", () => {
    expect(ids(moveNavItem(site, "nav-diary", -1)).slice(0, 2)).toEqual(["nav-diary", "nav-work"]);
    expect(moveNavItem(site, "nav-work", -1).nav.items).toEqual(site.nav.items);
    expect(ids(removeNavItem(site, "nav-rodeo"))).not.toContain("nav-rodeo");
  });
  it("nests items inside a manual dropdown and edits them there", () => {
    const dd = addNavItem(site, "dropdown");
    const child = addNavItem(dd.site, "external", dd.itemId);
    const s = updateNavItem(child.site, child.itemId, { label: "Shop", target: { kind: "url", url: "https://shop.example" } });
    expect(findNavItem(s.nav.items, dd.itemId)!.children).toHaveLength(1);
    expect(findNavItem(s.nav.items, child.itemId)).toMatchObject({ label: "Shop" });
    expect(findNavItem(removeNavItem(s, child.itemId).nav.items, dd.itemId)!.children).toEqual([]);
    expect(valid(s)).toBe(true);
  });
  it("sets nav behaviour", () => {
    expect(setNavBehaviour(site, { hideOnScroll: false, currentMarker: "underline" }).nav).toMatchObject({ hideOnScroll: false, currentMarker: "underline", items: site.nav.items });
  });
});

describe("nav rendering of all ten types", () => {
  const { site: s0, made } = everything();
  let s = updateNavItem(s0, made.page!, { badge: { text: "New" }, icon: { name: "star", position: "left" } });
  const child = addNavItem(s, "label", made.dropdown!);
  s = addNavItem(child.site, "external", made.dropdown!).site;
  const html = render(s);

  it("renders links with badge and icon", () => {
    expect(html).toContain('<span class="nav-badge">New</span>');
    expect(/<a class="pill-link hv-tint pill-split" href="\/work"><svg/.test(html)).toBe(true);
  });
  it("renders the section link with a marker for scroll highlighting", () => {
    expect(html).toContain('data-section="home-hero"');
  });
  it("opens external links in a new tab", () => {
    expect(html).toMatch(/href="https:\/\/"[^>]*target="_blank" rel="noopener"/);
  });
  it("renders a manual dropdown as a menu button with a labelled group", () => {
    expect(html).toMatch(/<button type="button" class="pill-link hv-tint pill-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="menu-[^"]+"/);
    expect(html).toContain('<span class="menu-label t-label">Label</span>');
  });
  it("renders the mega menu panel from sections, and its CSS", () => {
    expect(html).toMatch(/<div class="menu mega" id="menu-[^"]+" hidden="">\s*<section/);
    expect(html).toContain("Bodies of work");
    const panelId = findNavItem(s.nav.items, made.mega!)!.panel![0]!.id;
    expect(pageCss(s, s.pages[0]!)).toContain(`.s-${panelId}>.si{`);
  });
  it("renders the button, social icons, search and label", () => {
    expect(html).toContain('class="pill-cta pill-cta-filled"');
    expect(html).toMatch(/<a class="pill-icon"[^>]*aria-label="Instagram"/);
    expect(html).toContain("data-search-open");
    expect(html).toContain('id="nav-search"');
    expect(html).toContain('<span class="pill-label t-label">Label</span>');
  });
  it("sandboxes embeds", () => {
    expect(html).toMatch(/<iframe class="nav-embed" sandbox="allow-scripts"/);
    expect(html).not.toContain("allow-same-origin");
  });
  it("turns dropdowns and mega menus into accordions in the mobile sheet", () => {
    const sheet = html.slice(html.indexOf('id="nav-sheet"'));
    expect(sheet.match(/class="sheet-acc"/g)!.length).toBeGreaterThanOrEqual(3); // Work (auto), dropdown, mega
    expect(sheet).toContain('class="sheet-sub sheet-mega"');
  });
  it("respects show-on", () => {
    const only = render(updateNavItem(site, "nav-diary", { showOn: "desktop" }));
    const [pill, sheet] = [only.slice(0, only.indexOf('id="nav-sheet"')), only.slice(only.indexOf('id="nav-sheet"'))];
    expect(pill).toContain(">Diary<");
    expect(sheet).not.toContain(">Diary<");
  });
});

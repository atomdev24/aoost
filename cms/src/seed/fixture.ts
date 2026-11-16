import { Site, type Site as SiteT } from "../schema";
import { image, node, section, text } from "./build";
import { art, page, seedSite } from "./site";

/**
 * Test fixture: the seed site with a generic home page made of ordinary blocks (flow, canvas and grid
 * sections). The real home page is Alex's original design (seed/home.ts); the unit tests for the
 * editor model, the renderer and the connector need a page of plain blocks to work on.
 */
const genericHome = page({
  id: "home",
  title: "Home",
  slug: "/",
  isHome: true,
  showInNav: false,
  template: "blank",
  seo: { title: "aoost", description: "A visual diary, for people in the know." },
  sections: [
    section(
      "home-hero",
      "flow",
      [
        text("home-kicker", "label", "Diary · entry 014", { color: "token:muted" }),
        text("home-title", "hero", "A visual diary, for people in the know."),
        text("home-lede", "body", "Drawings, objects, playlists and a rodeo. Mostly made late at night.", { color: "token:text", maxWidth: "520px" }),
        node("home-cta", "Button", { label: "See the work", target: { kind: "page", pageId: "work" }, variant: "filled" }, { margin: "8px 0 0" }),
      ],
      { padding: "120px 20px 24px" },
      { padding: "180px 56px 40px" },
      "Hero",
    ),
    section(
      "home-art",
      "canvas",
      [
        image("home-desert", "/seed/desert.svg", "Line drawing of a cactus, a dune and a sun", { base: { x: 0, y: 40, w: 390, h: 300, z: 1 }, desktop: { x: 60, y: 60, w: 560, h: 430 } }, { lightbox: false }),
        image(
          "home-photo",
          art("hero.jpg"),
          "Artwork from the studio",
          { base: { x: 150, y: 250, w: 220, h: 160, z: 2, rotation: -3, radius: [18, 18, 18, 18], shadow: "hard" }, desktop: { x: 760, y: 70, w: 520, h: 372, rotation: 2 } },
        ),
        text("home-note", "small", "Scroll, or tap Menu.", { base: { x: 20, y: 0, w: 200, h: 24, z: 3, color: "token:muted" }, desktop: { x: 60, y: 10, w: 240, h: 24 } }),
      ],
      { padding: "0px", height: 440 },
      { height: 540 },
      "Line art",
    ),
    section(
      "home-latest",
      "grid",
      [
        text("home-latest-h", "h2", "Lately", { base: {}, desktop: { colSpan: 3 } }, "h2"),
        image("home-g1", art("grillz.jpg"), "Grillz", { aspectRatio: "4/3", radius: [6, 6, 6, 6] }),
        image("home-g2", art("monkey-figure.jpg"), "Monkey figure", { aspectRatio: "4/3", radius: [6, 6, 6, 6] }),
        image("home-g3", art("storefront.png"), "Storefront", { aspectRatio: "4/3", radius: [6, 6, 6, 6] }),
      ],
      { columns: 1, gap: 14, background: { color: "token:sand" } },
      { columns: 3, padding: "72px 56px" },
      "Lately",
    ),
    section("home-footer", "flow", [node("home-footer-ref", "Global", { globalId: "footer" })], { padding: "0px", maxWidth: undefined }, undefined, "Footer"),
  ],
});


export const fixtureSite: SiteT = Site.parse({ ...seedSite, pages: [genericHome, ...seedSite.pages.filter((p) => !p.isHome)] });

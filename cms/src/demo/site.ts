import type { Page, Site, Theme } from "../schema";
import { image, node, section, text } from "../seed/build";
import { page } from "../seed/site";
import { starterTemplates } from "../seed/templates";

/**
 * The demo editor's site (/demo/): a neutral wireframe, so the editor can be shown and talked
 * through without any of Alex's own work. Grey placeholder pictures (static/demo/*.svg), sample
 * words, and one of each kind of section. The demo resets to this every night and on "Reset demo".
 */

const ph = (shape: "wide" | "square" | "tall", dark = false) => `/demo-art/${shape}${dark ? "-dark" : ""}.svg`;

export const demoTheme: Theme = {
  colors: {
    bone: "#F6F6F4",
    sand: "#ECECE9",
    ink: "#1E1E1E",
    text: "#3B3B3B",
    muted: "#6A6A6A",
    rust: "#4C5FD5",
    rustOnDark: "#8E9BF0",
    line: "#1E1E1E",
  },
  fonts: {
    display: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
    mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  },
  fontFaces: [],
  googleFonts: ["Inter:wght@400;500;600;700"],
  typeStyles: {
    hero: { name: "Hero", font: "display", size: { base: 40, desktop: 76 }, weight: 700, lineHeight: 1.04, tracking: -0.03 },
    h1: { name: "Heading 1", font: "display", size: { base: 34, desktop: 56 }, weight: 700, lineHeight: 1.06, tracking: -0.025 },
    h2: { name: "Heading 2", font: "display", size: { base: 24, desktop: 32 }, weight: 600, lineHeight: 1.12, tracking: -0.015 },
    h3: { name: "Heading 3", font: "display", size: { base: 18, desktop: 21 }, weight: 600, lineHeight: 1.25, tracking: -0.005 },
    body: { name: "Body", font: "body", size: { base: 15, desktop: 16 }, weight: 400, lineHeight: 1.55, tracking: 0 },
    small: { name: "Small", font: "body", size: { base: 13 }, weight: 400, lineHeight: 1.5, tracking: 0 },
    label: { name: "Label", font: "body", size: { base: 12 }, weight: 600, lineHeight: 1.3, tracking: 0.1, uppercase: true },
  },
  radii: { none: 0, sm: 6, md: 12, lg: 18, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 28, xl: 48, xxl: 96 },
};

const footer = (id: string) => section(`${id}-footer`, "flow", [node(`${id}-footer-ref`, "Global", { globalId: "footer" })], { padding: "0px", maxWidth: undefined }, undefined, "Footer");

const home: Page = page({
  id: "home",
  title: "Home",
  slug: "/",
  isHome: true,
  showInNav: false,
  sections: [
    section(
      "home-hero",
      "flow",
      [
        text("home-kicker", "label", "Demo site · placeholder content", { color: "token:muted" }),
        text("home-title", "hero", "A headline goes here."),
        text("home-lede", "body", "This is sample text in a flow section. Click any block to edit it, drag the handles to resize, or press **C** to leave a comment on it.", { color: "token:text", maxWidth: "560px" }),
        node("home-cta", "Button", { label: "See the work page", target: { kind: "page", pageId: "work" }, variant: "filled" }, { margin: "8px 0 0" }),
      ],
      { padding: "120px 20px 40px" },
      { padding: "180px 56px 64px" },
      "Intro",
    ),
    section(
      "home-feature",
      "flow",
      [image("home-feature-img", ph("wide"), "Placeholder picture, wide", { aspectRatio: "16/9", radius: [12, 12, 12, 12] }, { caption: "A wide picture with a caption" })],
      { padding: "0px 20px 40px" },
      { padding: "0px 56px 72px" },
      "Feature picture",
    ),
    section(
      "home-grid",
      "grid",
      [
        text("home-grid-h", "h2", "A grid section", { base: {}, desktop: { colSpan: 3 } }, "h2"),
        image("home-grid-1", ph("square"), "Placeholder picture 1", { aspectRatio: "1/1", radius: [12, 12, 12, 12] }, { caption: "Item one" }),
        image("home-grid-2", ph("square", true), "Placeholder picture 2", { aspectRatio: "1/1", radius: [12, 12, 12, 12] }, { caption: "Item two" }),
        image("home-grid-3", ph("square"), "Placeholder picture 3", { aspectRatio: "1/1", radius: [12, 12, 12, 12] }, { caption: "Item three" }),
      ],
      { columns: 1, gap: 16, background: { color: "token:sand" } },
      { columns: 3, padding: "72px 56px" },
      "Grid",
    ),
    section(
      "home-canvas",
      "canvas",
      [
        image("home-canvas-a", ph("tall", true), "Placeholder picture, tall", { base: { x: 20, y: 40, w: 170, h: 226, z: 1, radius: [10, 10, 10, 10] }, desktop: { x: 120, y: 60, w: 300, h: 400, rotation: -3 } }, { lightbox: false }),
        image("home-canvas-b", ph("wide"), "Placeholder picture, wide", { base: { x: 150, y: 150, w: 220, h: 124, z: 2, radius: [10, 10, 10, 10], shadow: "hard" }, desktop: { x: 480, y: 160, w: 460, h: 259, rotation: 2 } }, { lightbox: false }),
        text("home-canvas-t", "h2", "A free-layout section", { base: { x: 20, y: 300, w: 340, h: 36, z: 3 }, desktop: { x: 980, y: 120, w: 360, h: 44 } }, "h2"),
        text("home-canvas-p", "body", "Everything here sits where you put it, with its own spot on phones and desktops.", { base: { x: 20, y: 342, w: 340, h: 60, z: 3 }, desktop: { x: 980, y: 180, w: 340, h: 80 } }),
      ],
      { padding: "0px", height: 430 },
      { height: 540 },
      "Free layout",
    ),
    section(
      "home-split",
      "grid",
      [
        text("home-split-h", "h2", "Two columns", {}, "h2"),
        image("home-split-img", ph("tall"), "Placeholder picture, tall", { base: { aspectRatio: "3/4", radius: [12, 12, 12, 12] }, desktop: { rowSpan: 2 } }),
        text("home-split-text", "body", "Text on one side, a picture on the other. On a phone they stack. This sample sentence is here so the column has some weight.", { color: "token:text" }),
      ],
      { columns: 1, gap: 24 },
      { columns: 2, padding: "72px 56px" },
      "Two columns",
    ),
    footer("home"),
  ],
});

const work: Page = page({
  id: "work",
  title: "Work",
  slug: "/work",
  template: "gallery",
  sections: [
    section(
      "work-head",
      "flow",
      [text("work-kicker", "label", "/work", { color: "token:muted" }), text("work-title", "h1", "Work"), text("work-blurb", "body", "A gallery page made from the Gallery template.", { color: "token:text", maxWidth: "560px" })],
      { padding: "120px 20px 12px" },
      { padding: "160px 56px 20px" },
      "Heading",
    ),
    section(
      "work-gallery",
      "flow",
      [
        node("work-grid", "GalleryGrid", {
          items: (["wide", "square", "tall", "wide", "tall", "square"] as const).map((s, i) => ({ src: ph(s, i % 2 === 1), alt: `Placeholder ${i + 1}`, title: `Piece ${i + 1}` })),
          columns: 2,
          columnsDesktop: 3,
          gap: 12,
          lightbox: true,
        }),
      ],
      { padding: "12px 20px 64px" },
      { padding: "20px 56px 96px" },
      "Gallery",
    ),
    footer("work"),
  ],
});

const simple = (id: string, title: string, slug: string, body: Page["sections"][number]["children"], extra: Partial<Page> = {}): Page =>
  page({
    id,
    title,
    slug,
    ...extra,
    sections: [
      section(`${id}-head`, "flow", [text(`${id}-kicker`, "label", slug, { color: "token:muted" }), text(`${id}-title`, "h1", title), ...body], { padding: "120px 20px 64px" }, { padding: "160px 56px 96px" }, "Content"),
      footer(id),
    ],
  });

const journal = simple("journal", "Journal", "/journal", [node("journal-list", "DiaryList", { limit: 0, showImages: true }, { margin: "20px 0 0" })], { template: "diary" });

const about = simple("about", "About", "/about", [
  text("about-body", "body", "A short paragraph about the person or studio behind the site. Swap this for real words.", { color: "token:text", maxWidth: "560px" }),
  image("about-img", ph("wide", true), "Placeholder portrait", { aspectRatio: "16/9", radius: [12, 12, 12, 12], margin: "20px 0 0", maxWidth: "560px" }),
]);

const contact = simple("contact", "Contact", "/contact", [
  text("contact-body", "body", "Buttons can link to a page, a web address or an email.", { color: "token:text" }),
  node("contact-mail", "Button", { label: "Send an email", target: { kind: "url", url: "mailto:hello@example.com" }, variant: "filled" }, { margin: "16px 0 0" }),
  node("contact-work", "Button", { label: "Back to the work", target: { kind: "page", pageId: "work" }, variant: "outline" }),
]);

export const demoSite: Site = {
  settings: {
    title: "Studio (demo)",
    socials: [],
    defaultSeo: { title: "Studio (demo)", description: "A sample site for showing the editor." },
  },
  theme: demoTheme,
  nav: {
    style: "pill",
    logoText: "Studio",
    showLogoMark: false,
    hideOnScroll: true,
    currentMarker: "pill",
    items: [
      { id: "nav-work", type: "page", target: { kind: "page", pageId: "work" }, showOn: "both", hover: "tint" },
      { id: "nav-journal", type: "page", target: { kind: "page", pageId: "journal" }, showOn: "both", hover: "tint" },
      { id: "nav-about", type: "page", target: { kind: "page", pageId: "about" }, showOn: "both", hover: "tint" },
      { id: "nav-contact", type: "page", target: { kind: "page", pageId: "contact" }, showOn: "both", hover: "tint" },
    ],
  },
  globals: [{ id: "footer", name: "Footer", node: node("footer-node", "Footer", { text: "Demo site · placeholder content", showSocials: false }) }],
  templates: starterTemplates,
  collections: {
    diary: [
      { id: "entry-3", date: "2026-11-20", title: "A third entry", text: "Journal entries come from a collection, so the list updates on every page that shows it.", image: ph("wide"), imageAlt: "Placeholder" },
      { id: "entry-2", date: "2026-11-12", title: "A second entry", text: "Sample text for an entry. Short and plain.", image: ph("square", true), imageAlt: "Placeholder" },
      { id: "entry-1", date: "2026-11-03", title: "The first entry", text: "Entries can have a picture or not." },
    ],
    playlists: [],
  },
  pages: [home, work, journal, about, contact],
  redirects: [],
};

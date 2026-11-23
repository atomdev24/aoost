import { createNode, createSection } from "../../model/page-ops";
import type { Node, Section, Style } from "../../schema";

/**
 * Whole-page designs for the Templates panel (the demo's left rail): pick one
 * to start a page, or try several on one page and keep the one you like.
 * Each call makes fresh ids, so a template can be used any number of times.
 */
export type SiteTemplate = {
  id: string;
  name: string;
  hint: string;
  /** A picture for the panel's card. */
  thumb: string;
  /** Hide the site's own nav: the design brings its own top bar. */
  hideNav: boolean;
  sections: () => Section[];
};

const INK = "#17293E";
const BLUE = "#0075E1";
const MUTED = "#5A6573";
const PALE = "#F4F8FD";
const A = "/art/";

type Sizes = { base?: Style; desktop?: Style };
const node = (type: string, content: Record<string, unknown>, s: Sizes = {}): Node => {
  const n = createNode(type, { content, style: s.base });
  return s.desktop ? { ...n, style: { ...n.style, desktop: s.desktop } } : n;
};
const text = (t: string, styleId: string, tag: "h1" | "h2" | "h3" | "p", s?: Sizes) => node("Text", { text: t, styleId, tag }, s);
const button = (label: string, url: string, variant: "filled" | "outline" | "text", color: string, s?: Sizes) => node("Button", { label, target: { kind: "url", url }, variant, color }, s);
const image = (src: string, alt: string, s?: Sizes, extra: Record<string, unknown> = {}) => node("Image", { src, alt, lightbox: false, ...extra }, s);
/** A logo or wordmark: shown whole at its own shape, never cropped. */
const mark = (src: string, alt: string, ratio: string, s: Sizes) => {
  const n = image(src, alt, { base: { ...s.base, aspectRatio: ratio }, desktop: s.desktop ? { ...s.desktop, aspectRatio: ratio } : undefined });
  return { ...n, frame: { base: { fit: "fit" as const, focalX: 0, focalY: 50, zoom: 1, panX: 0, panY: 0 } } };
};
type Layout = Section["layout"]["base"];
const section = (kind: Section["kind"], name: string, base: Layout, desktop: Partial<Layout> | undefined, children: Node[]): Section =>
  createSection(kind, { name, layout: desktop ? { base, desktop: { ...base, ...desktop } } : { base }, children });

const CROPS = [
  { crop: "Citrus", img: "tpl_aero_citrus.webp", tags: "Size, Grade, Bin Scan", text: "See exactly why fruit is falling out of spec in the field and at intake.", langs: "English, English (AU), Español, Português, Italiano, Türkçe" },
  { crop: "Apples", img: "tpl_aero_apples.webp", tags: "Size, Grade, Bin Scan", text: "Plan your harvest with starch in the Harvest Planner.", langs: "English, Español" },
  { crop: "Table grapes", img: "tpl_aero_grapes.webp", tags: "Size, Grade, Bin Scan", text: "Know which blocks are ready before you commit a picking team.", langs: "English, Español, Türkçe" },
  { crop: "Cherries", img: "tpl_aero_cherries.webp", tags: "Size, Grade", text: "Rank blocks on size and colour before you pick.", langs: "English, Español" },
  { crop: "Avocado", img: "tpl_aero_avocado.webp", tags: "Size", text: "More accurate mass estimates for Hass.", langs: "English, Español" },
];
const cards = (columns: number) =>
  node("Cards", {
    cards: CROPS.map((c) => ({
      image: A + c.img,
      alt: `${c.crop} catalogue cover`,
      eyebrow: c.crop,
      title: `TrueFruit for ${c.crop.toLowerCase()}`,
      tags: c.tags,
      text: c.text,
      listLabel: "Available in",
      list: c.langs,
      primaryLabel: "View",
      primaryUrl: "#",
      secondaryLabel: "Download",
      secondaryUrl: "#",
    })),
    columns,
    accent: BLUE,
    ink: INK,
    surface: "#FFFFFF",
  });

/** The white bar along the top: logo, links, Login and Request a demo. */
const topBar = () =>
  section("grid", "Top bar", { columns: 2, gap: 12, padding: "14px 16px", align: "center", background: { color: "#FFFFFF" } }, { columns: 6, padding: "16px 40px", maxWidth: 1240 }, [
    mark(A + "tpl_aero_logo.svg", "Aerobotics", "132/23", { base: { width: "132px" } }),
    text(["Products", "Pricing", "Success stories", "About", "Blog", "Contact"].join("\u00a0\u00a0\u00a0\u00a0 "), "small", "p", { base: { hidden: true, color: INK }, desktop: { hidden: false, colSpan: 3, textAlign: "center", color: INK } }),
    button("Login", "#", "outline", BLUE, { base: { hidden: true }, desktop: { hidden: false, justifySelf: "end" } }),
    button("Request a demo", "#", "filled", BLUE, { base: { justifySelf: "end" } }),
  ]);

/** Navy footer with the faint wordmark and three link columns. */
const footer = () =>
  section("grid", "Footer", { columns: 2, gap: 24, padding: "48px 20px 32px", background: { color: INK } }, { columns: 4, padding: "72px 40px 40px", maxWidth: 1240, gap: 32 }, [
    mark(A + "tpl_aero_wordmark.webp", "Aerobotics", "1600/279", { base: { colSpan: 2 }, desktop: { colSpan: 4 } }),
    text("**Products**\nTrueFruit Size\nTrueFruit Grade\nTrueFruit Bin Scan\nDrone Scan\nPest & Disease", "small", "p", { base: { color: "#FFFFFF" } }),
    text("**Company**\nPricing\nSuccess stories\nAbout us\nBlog\nCareers\nContact us", "small", "p", { base: { color: "#FFFFFF" } }),
    text("**Partners**\nDrone partners", "small", "p", { base: { color: "#FFFFFF" } }),
    text("Legal · © 2026 Aerobotics, (Pty) LTD All rights reserved.", "small", "p", { base: { colSpan: 2, color: "rgba(255,255,255,.6)" }, desktop: { colSpan: 4, color: "rgba(255,255,255,.6)" } }),
  ]);

/** Point a "#catalogues" button at the section it should scroll to. */
function linkCatalogues(sections: Section[]): Section[] {
  const target = sections.find((s) => s.name === "Catalogues");
  if (!target) return sections;
  return sections.map((s) => ({
    ...s,
    children: s.children.map((n) => (n.type === "Button" && (n.content.target as { url?: string })?.url === "#catalogues" ? { ...n, content: { ...n.content, target: { kind: "url", url: `#${target.id}` } } } : n)),
  }));
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: "aero-brochures",
    name: "Brochures, photo hero",
    hint: "A full-width photo with the headline on top, then catalogue cards",
    thumb: A + "tpl_aero_hero_wide.webp",
    hideNav: true,
    sections: () =>
      linkCatalogues([
        topBar(),
        section(
          "flow",
          "Hero",
          { columns: 1, gap: 16, padding: "72px 20px 380px", minHeight: "640px", align: "start", background: { image: A + "tpl_aero_hero_tall.webp", overlay: "rgba(10,22,36,0.22)" } },
          { padding: "150px 56px 150px", minHeight: "620px", maxWidth: 1240, background: { image: A + "tpl_aero_hero_wide.webp", overlay: "rgba(10,22,36,0.32)" } },
          [
            text("See what TrueFruit can do for your crop this season", "h1", "h1", { base: { color: "#FFFFFF", maxWidth: "560px" } }),
            text("View or download the latest product catalogue for your crop, in your language.", "body", "p", { base: { color: "rgba(255,255,255,.92)", maxWidth: "420px" } }),
            button("Browse catalogues", "#catalogues", "filled", BLUE, { base: { margin: "8px 0 0" } }),
          ],
        ),
        section("flow", "Catalogues", { columns: 1, gap: 24, padding: "40px 16px 56px", background: { color: PALE } }, { padding: "48px 24px 80px", maxWidth: 1240 }, [
          text("Product catalogues", "h2", "h2", { base: { color: INK } }),
          cards(3),
        ]),
        section("flow", "Video", { columns: 1, gap: 20, padding: "8px 16px 56px", background: { color: PALE } }, { padding: "0px 24px 88px", maxWidth: 1040 }, [
          text("See TrueFruit at work", "h2", "h2", { base: { color: INK } }),
          node(
            "Video",
            { source: "link", src: "", url: "https://www.youtube.com/watch?v=27Aj5-LUDUU", poster: A + "tpl_aero_hero_wide.webp", alt: "TrueFruit at work", autoplay: false, loop: false, controls: true, play: "disc", title: "TrueFruit: from the tree to the report", channel: "Aerobotics", avatar: A + "tpl_aero_mark.svg", duration: "" },
            { base: { aspectRatio: "16/9", radius: [16, 16, 16, 16] } },
          ),
        ]),
        footer(),
      ]),
  },
  {
    id: "aero-brochures-split",
    name: "Brochures, split hero",
    hint: "The phone photo beside the headline, then the cards two to a row",
    thumb: A + "tpl_aero_hero_tall.webp",
    hideNav: true,
    sections: () =>
      linkCatalogues([
        topBar(),
        section("grid", "Hero", { columns: 1, gap: 24, padding: "40px 20px 40px", align: "center", background: { color: PALE } }, { columns: 2, gap: 56, padding: "72px 40px", maxWidth: 1240 }, [
          image(A + "tpl_aero_hero_tall.webp", "A phone scanning fruit on the tree", { base: { aspectRatio: "4/5", radius: [20, 20, 20, 20] }, desktop: { aspectRatio: "4/5", radius: [24, 24, 24, 24], rowSpan: 4 } }, {
            width: 1200,
            height: 1791,
            // Fruit readings on the citrus behind the phone (drag them in the editor to move them).
            markStyle: "ring",
            marks: [
              // On the picture itself (percent of the whole photo), so they stay on the fruit at any crop.
              { x: 18, y: 22.4, r: 8, size: 68, colour: "break", side: "right" },
              { x: 53, y: 39.1, r: 7.5, size: 72, colour: "green", side: "left" },
              { x: 70.5, y: 37.9, r: 7, size: 64, colour: "mostly", side: "right" },
            ],
          }),
          text("Product catalogues", "label", "p", { base: { color: BLUE } }),
          text("See what TrueFruit can do for your crop this season", "h1", "h1", { base: { color: INK } }),
          text("View or download the latest product catalogue for your crop, in your language.", "body", "p", { base: { color: MUTED } }),
          button("Browse catalogues", "#catalogues", "filled", BLUE, { base: { justifySelf: "start" } }),
        ]),
        section("flow", "Catalogues", { columns: 1, gap: 24, padding: "40px 16px 56px", background: { color: "#FFFFFF" } }, { padding: "56px 24px 88px", maxWidth: 980 }, [
          text("Choose your crop", "h2", "h2", { base: { color: INK } }),
          cards(2),
        ]),
        footer(),
      ]),
  },
];

export const siteTemplate = (id: string) => SITE_TEMPLATES.find((t) => t.id === id);

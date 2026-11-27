import type { Node, Section } from "../schema";
import { createNode, createSection } from "./page-ops";

/*
 * The eight starting layouts in New page (Alex picked "A · line wireframes", 27 Nov 2026):
 * plain blocks in the site's own type styles and colours, with neutral placeholder words and
 * empty pictures (drawn as a soft grey box with a picture icon until one is chosen). In the demo
 * the six that have an Aerobotics template use it instead (ui/NewPageModal.tsx).
 * Each call makes fresh ids.
 */

export type StructureId = "blank" | "landing" | "product" | "pricing" | "about" | "contact" | "article" | "event";

export type Structure = {
  id: StructureId;
  name: string;
  hint: string;
  /** The Aerobotics template used instead in the demo. */
  aero?: string;
  sections: () => Section[];
};

/** Old portfolio starters (seed/templates.ts) that these replace in New page. */
export const LEGACY_PAGE_TEMPLATES = ["blank", "gallery", "diary", "playlist"];

type Tag = "h1" | "h2" | "h3" | "p";
const text = (t: string, styleId: string, tag: Tag = "p", style: Node["style"]["base"] = {}): Node => createNode("Text", { content: { text: t, styleId, tag }, style: style as never });
const muted = (t: string, styleId = "body") => text(t, styleId, "p", { color: "token:muted" });
const picture = (alt: string, ratio = "4/3"): Node => createNode("Image", { content: { src: "", alt, lightbox: false }, style: { aspectRatio: ratio, radius: [10, 10, 10, 10] } as never });
const button = (label: string, variant: "filled" | "outline" = "filled"): Node => createNode("Button", { content: { label, target: { kind: "url", url: "#" }, variant } });

const TOP = { base: { padding: "112px 20px 56px" }, desktop: { padding: "152px 56px 88px" } };
const flow = (name: string, children: Node[], top = false): Section => {
  const s = createSection("flow", { name, children });
  return top ? { ...s, layout: { base: { ...s.layout.base, ...TOP.base }, desktop: { ...s.layout.desktop, ...TOP.desktop } } } : s;
};
/**
 * Columns side by side from tablet up, stacked on phones: each inner list is one column (a column
 * stack, Section.stacks), so a point's picture, title and words stay together.
 */
const cols = (name: string, columns: Node[][], top = false, widths?: number[]): Section => {
  const s = createSection("grid", { name, stacks: columns.length, children: columns.flatMap((c, col) => c.map((n) => ({ ...n, col }))) });
  const wide = { columns: columns.length, gap: 32, ...(widths ? { colWidths: widths } : {}) };
  const base = { ...s.layout.base, columns: 1, gap: 24, ...(top ? TOP.base : {}) };
  return { ...s, layout: { base, tablet: { ...wide, gap: 24 }, desktop: { ...s.layout.desktop, ...wide, ...(top ? TOP.desktop : {}) } } };
};
/** A plain grid: every child is one cell (pictures in a row). */
const grid = (name: string, columns: number, children: Node[]): Section => {
  const s = createSection("grid", { name, children });
  return { ...s, layout: { base: { ...s.layout.base, columns: 2, gap: 12 }, desktop: { ...s.layout.desktop, columns, gap: 16 } } };
};
/** A two-column hero: words on the left, a picture on the right. */
const heroSection = (eyebrow: string, title: string, lede: string, cta: string): Section =>
  cols(
    "Hero",
    [[createNode("Text", { content: { text: eyebrow, styleId: "label", tag: "p" }, style: { color: "token:rust" } as never }), text(title, "h1", "h1"), text(lede, "body"), button(cta)], [picture("Picture for the top of the page")]],
    true,
    [52, 48],
  );

const point = (n: number): Node[] => [picture(`Picture for point ${n}`, "3/2"), text(`Point ${n}`, "h3", "h3"), muted("A sentence or two about it.")];
const three = (name: string) => cols(name, [point(1), point(2), point(3)]);

export const STRUCTURES: Structure[] = [
  {
    id: "blank",
    name: "Blank",
    hint: "Just a heading",
    sections: () => [flow("Content", [text("Untitled", "h1", "h1")], true)],
  },
  {
    id: "landing",
    name: "Landing page",
    hint: "Hero, three points, a quote, a call to action",
    aero: "aero-home",
    sections: () => [
      heroSection("Eyebrow", "Headline for this page", "One or two sentences that say what the page is about.", "Main button"),
      three("Points"),
      flow("Quote", [text("“A short quote from someone who uses it.”", "h2", "p"), muted("Name, company", "small")]),
      flow("Call to action", [text("Ask for the one thing you want people to do", "h2", "h2"), button("Main button")]),
    ],
  },
  {
    id: "product",
    name: "Product",
    hint: "Product hero, how it works, benefits, a quote",
    aero: "aero-product",
    sections: () => [
      heroSection("Product name", "What it does, in a line", "Who it's for and what it changes for them.", "Book a demo"),
      cols("How it works", [[picture("Picture of the product in use", "16/10")], [text("How it works", "h2", "h2"), muted("Explain the product in a short paragraph. Keep it to what someone needs to decide.")]]),
      three("Benefits"),
      flow("Quote", [text("“A short quote from someone who uses it.”", "h2", "p"), muted("Name, company", "small")]),
    ],
  },
  {
    id: "pricing",
    name: "Pricing",
    hint: "Plans side by side, then questions",
    aero: "aero-pricing",
    sections: () => [
      flow("Heading", [text("Pricing", "h1", "h1"), muted("One line on how pricing works.")], true),
      cols(
        "Plans",
        ["Starter", "Team", "Custom"].map((plan) => [text(plan, "h3", "h3"), text("Price", "h2", "p"), muted("What's included, in a few short lines."), button("Choose", plan === "Team" ? "filled" : "outline")]),
      ),
      flow("Questions", [text("Questions", "h2", "h2"), ...[1, 2, 3].flatMap((n) => [text(`Question ${n}?`, "h3", "h3"), muted("The answer, in a sentence or two.")])]),
    ],
  },
  {
    id: "about",
    name: "About",
    hint: "Intro, numbers, photos, the story",
    aero: "aero-about",
    sections: () => [
      flow("Intro", [text("About", "h1", "h1"), muted("Who you are and why you do this, in two sentences.")], true),
      cols("Numbers", [1, 2, 3, 4].map((n) => [text("00", "h2", "p"), muted(`What number ${n} counts`, "small")])),
      grid("Photos", 3, [picture("Photo 1", "1/1"), picture("Photo 2", "1/1"), picture("Photo 3", "1/1")]),
      flow("Story", [text("The story", "h2", "h2"), muted("How it started and where it's going. A short paragraph or two.")]),
    ],
  },
  {
    id: "contact",
    name: "Contact",
    hint: "Ways to reach you, beside a picture",
    aero: "aero-contact",
    sections: () => [
      cols("Contact", [[text("Get in touch", "h1", "h1"), muted("Say who to contact and how soon they'll hear back."), text("Email · Phone · Address", "body"), button("Send an email")], [picture("Picture of the place or team")]], true, [52, 48]),
    ],
  },
  {
    id: "article",
    name: "Article",
    hint: "Cover picture, title and long-form text",
    sections: () => [
      flow("Article", [picture("Cover picture", "16/9"), muted("Date · Author", "small"), text("Article title", "h1", "h1"), muted("A one-line summary of the article."), text("Start writing here. Paragraphs, links and lists all work.", "body")], true),
    ],
  },
  {
    id: "event",
    name: "Event",
    hint: "Date and place, what's on, booking",
    aero: "aero-campaign",
    sections: () => [
      heroSection("Date · Place", "Event name", "What happens there and why it's worth coming.", "Book a time"),
      three("What's on"),
      flow("Booking", [text("Book a time with us", "h2", "h2"), muted("Say how to book and what happens next."), button("Book a time")]),
    ],
  },
];

export const structure = (id: string) => STRUCTURES.find((s) => s.id === id);

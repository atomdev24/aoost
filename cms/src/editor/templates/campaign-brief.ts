import { art } from "../../components/aerobotics/shared";
import { addTranslation } from "../../model/i18n";
import { applyAeroboticsNav } from "../../model/nav-presets";
import { createPage, slugify } from "../../model/pages";
import type { Page, Section, Site } from "../../schema";
import { band, footer, form } from "./aerobotics-templates";

/**
 * Campaign pages from a brief (research item 3, EDITOR-CAMPAIGN-BRIEF.md): a few answers become a
 * whole campaign page made of the Aerobotics blocks, with the words filled in. Claude can then
 * polish the wording and do the other languages from the same brief (an @Claude comment).
 */
export const BRIEF_PRODUCTS = {
  binscan: { name: "TrueFruit Bin Scan", line: "Post-harvest size and quality classification", text: "Scan bins as they arrive and know their size distribution, colour and blemishes before they're packed.", image: "product_binscan", alt: "Scanning a bin of lemons with a phone", url: "https://aerobotics.com/true-fruit-bin-scan" },
  size: { name: "TrueFruit Size", line: "Precise fruit sizing and size forecasting", text: "Turn a phone into a digital calliper: photos of fruit on the tree become sizes and a forecast of the harvest.", image: "product_size", alt: "Measuring oranges on the tree with a phone", url: "https://aerobotics.com/true-fruit-size" },
  grade: { name: "TrueFruit Grade", line: "Automated size, colour and blemish measurements", text: "Know the grade of your fruit on the tree, so picking and packing plans start from facts.", image: "product_grade", alt: "Grading oranges on the tree with a phone", url: "https://aerobotics.com/true-fruit-grade" },
} as const;
export type BriefProduct = keyof typeof BRIEF_PRODUCTS;

export const BRIEF_ASKS = {
  meeting: { label: "Book a meeting", form: "contact" as const },
  demo: { label: "Request a demo", form: "demo" as const },
  learn: { label: "Find out more", form: null },
} as const;
export type BriefAsk = keyof typeof BRIEF_ASKS;

export type CampaignBrief = {
  /** "Interpoma 2026": also the page's name. */
  event: string;
  /** "25–27 Nov 2026" and "Bolzano, stand B12", as people should read them. */
  when?: string;
  where?: string;
  product: BriefProduct;
  /** The one thing to say; a headline is made from the product when empty. */
  message?: string;
  ask: BriefAsk;
  /** Other languages to start (linked translations, drafts until switched live). */
  languages?: string[];
  /** Last day it's up (YYYY-MM-DD). */
  endDate?: string;
};

const sentence = (s: string) => s.trim().replace(/\s+/g, " ");

/** The page's sections for a brief. */
export function campaignSections(b: CampaignBrief): Section[] {
  const p = BRIEF_PRODUCTS[b.product];
  const ask = BRIEF_ASKS[b.ask];
  const place = [b.where, b.when].filter(Boolean).map((x) => sentence(x!)).join(", ");
  const event = sentence(b.event) || "our next event";
  // The form, switched off until someone turns on "Send submissions to HubSpot"; the hero's button jumps to it.
  const book = ask.form
    ? (() => {
        const f = band(b.ask === "meeting" ? "Book a meeting" : "Request a demo", "AeroText", { title: `${ask.label}${b.when ? ` at ${event}` : ""}`, body: place ? `We'll be at ${place}.` : "", align: "center", bg: "soft" });
        return { ...f, children: [...f.children, form(ask.form)] };
      })()
    : null;
  const hero = band("Hero", "AeroHero", {
    image: art(p.image),
    alt: p.alt,
    height: "medium",
    eyebrow: place ? `Meet us at ${event} · ${place}` : `Meet us at ${event}`,
    title: sentence(b.message ?? "") || `See ${p.name} live at ${event}`,
    text: `${p.text} ${b.ask === "meeting" ? "Book a time and we'll show you on your own fruit." : b.ask === "demo" ? "Ask for a demo and we'll set it up for you." : ""}`.trim(),
    primaryLabel: ask.label,
    primaryUrl: book ? `#${book.id}` : p.url,
    secondaryLabel: `About ${p.name}`,
    secondaryUrl: p.url,
    logos: [],
  });
  const product = band("Product", "AeroSplit", {
    title: p.line,
    text: p.text,
    cropsLabel: "Available for",
    media: "picture",
    image: art(p.image),
    alt: p.alt,
    primaryLabel: `Discover ${p.name}`,
    primaryUrl: p.url,
    bg: "white",
  });
  const sections: Section[] = [hero, product, band("Quote", "AeroTestimonial")];
  if (book) sections.push(book);
  sections.push(footer());
  return sections;
}

/** A one-line description for search and sharing. */
export const campaignDescription = (b: CampaignBrief) =>
  `${BRIEF_PRODUCTS[b.product].name} at ${sentence(b.event)}${b.when ? `, ${sentence(b.when)}` : ""}${b.where ? ` (${sentence(b.where)})` : ""}. ${BRIEF_ASKS[b.ask].label}.`;

/** The brief in words, for Claude (and for whoever opens the page later). */
export function briefText(b: CampaignBrief): string {
  const p = BRIEF_PRODUCTS[b.product];
  return [
    `@Claude this page was made from a campaign brief. Please polish the wording on every block (keep it short and plain, Aerobotics' voice)${b.languages?.length ? ` and translate it into ${b.languages.map((l) => l.toUpperCase()).join(", ")}` : ""}.`,
    `Event: ${sentence(b.event)}${b.when ? `, ${sentence(b.when)}` : ""}${b.where ? `, ${sentence(b.where)}` : ""}.`,
    `Product: ${p.name}. Ask people to: ${BRIEF_ASKS[b.ask].label.toLowerCase()}.`,
    b.message ? `Message: ${sentence(b.message)}` : "",
    b.endDate ? `It comes down after ${b.endDate}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Add the campaign page to the site (with the Aerobotics nav, as the templates do). */
export function addCampaignFromBrief(site: Site, b: CampaignBrief, opts: { parentId?: string | null } = {}): { site: Site; pageId: string } {
  const withNav = site.nav.logoImage !== "/art/tpl_aero_logo.svg" ? applyAeroboticsNav(site) : site;
  const made = createPage(withNav, { name: sentence(b.event) || "Campaign", showInNav: false, parentId: opts.parentId ?? null, kind: "campaign", unpublishAt: b.endDate || undefined });
  const fill = (page: Page): Page => {
    let next: Page = { ...page, sections: campaignSections(b), overlays: [], seo: { ...page.seo, description: campaignDescription(b) }, hideNav: false };
    for (const l of b.languages ?? []) next = addTranslation(next, l);
    return next;
  };
  return { site: { ...made.site, pages: made.site.pages.map((p) => (p.id === made.pageId ? fill(p) : p)) }, pageId: made.pageId };
}

export const briefSlug = (b: CampaignBrief) => `/${slugify(b.event)}`;

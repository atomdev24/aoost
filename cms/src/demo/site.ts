import type { NavConfig, Page, Site, Theme } from "../schema";
import { SNAPSHOT_TEMPLATES } from "../editor/templates/snapshot-templates";
import { aeroboticsNav } from "../model/nav-presets";
import { aeroboticsDemoPages, linkNavToDemoPages } from "./aerobotics-pages";
import { node } from "../seed/build";
import { page } from "../seed/site";
import { starterTemplates } from "../seed/templates";

/**
 * The demo editor's site (/demo/): an Aerobotics site (the homepage concept and one page per
 * Aerobotics page type, see aerobotics-pages.ts), so the editor can be shown without any of Alex's
 * own work. The demo resets to this every night and on "Reset demo".
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


/** The demo's Home: the saved homepage concept (Templates › Homepage concept). */
const home = (): Page => page({ id: "home", title: "Home", slug: "/", isHome: true, showInNav: false, sections: SNAPSHOT_TEMPLATES.find((t) => t.id === "aero-home-concept")!.sections() });

/** Pages are built on first use, not at start (fresh ids need randomness a Worker can't use at start). */
let pages: Page[] | null = null;
const demoPages = () => (pages ??= [home(), ...aeroboticsDemoPages()]);

export const demoSite: Site = {
  settings: {
    title: "Aerobotics (demo)",
    socials: [],
    defaultSeo: { title: "Aerobotics (demo)", description: "A sample Aerobotics site for showing the editor." },
  },
  theme: demoTheme,
  nav: linkNavToDemoPages({ hideOnScroll: true, ...aeroboticsNav() } as NavConfig),
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
  get pages() {
    return demoPages();
  },
  redirects: [],
};

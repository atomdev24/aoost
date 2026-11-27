import type { Page, Site } from "../schema";
import { image, node, section, text } from "./build";
import { seedTheme } from "./theme";
import { aoostHome } from "./home";
import { samplePage } from "./sample";
import { starterTemplates } from "./templates";

export const page = (p: Partial<Page> & Pick<Page, "id" | "title" | "slug" | "sections">): Page => ({
  parentId: null,
  status: "published",
  template: "blank",
  seo: {},
  isHome: false,
  showInNav: true,
  overlays: [],
  ...p,
});

export const art = (file: string) => `/art/${file}`;

const galleryPage = (id: string, title: string, slug: string, parentId: string | null, blurb: string, files: [string, string][]): Page =>
  page({
    id,
    title,
    slug,
    parentId,
    template: "gallery",
    sections: [
      section(
        `${id}-head`,
        "flow",
        [text(`${id}-kicker`, "label", slug, { color: "token:muted" }), text(`${id}-title`, "h1", title), text(`${id}-blurb`, "body", blurb, { color: "token:text", maxWidth: "560px" })],
        { padding: "120px 20px 12px" },
        { padding: "160px 56px 20px" },
        "Heading",
      ),
      section(
        `${id}-gallery`,
        "flow",
        [
          node(`${id}-grid`, "GalleryGrid", {
            items: files.map(([file, alt]) => ({ src: art(file), alt, title: alt })),
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
      section(`${id}-footer`, "flow", [node(`${id}-footer-ref`, "Global", { globalId: "footer" })], { padding: "0px", maxWidth: undefined }, undefined, "Footer"),
    ],
  });

const simplePage = (id: string, title: string, slug: string, body: Page["sections"][number]["children"], extra: Partial<Page> = {}): Page =>
  page({
    id,
    title,
    slug,
    ...extra,
    sections: [
      section(
        `${id}-head`,
        "flow",
        [text(`${id}-kicker`, "label", slug, { color: "token:muted" }), text(`${id}-title`, "h1", title), ...body],
        { padding: "120px 20px 64px" },
        { padding: "160px 56px 96px" },
        "Content",
      ),
      section(`${id}-footer`, "flow", [node(`${id}-footer-ref`, "Global", { globalId: "footer" })], { padding: "0px", maxWidth: undefined }, undefined, "Footer"),
    ],
  });

export const seedSite: Site = {
  settings: {
    title: "aoost",
    socials: [
      { network: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
      { network: "spotify", url: "https://open.spotify.com/", label: "Spotify" },
    ],
    defaultSeo: { title: "aoost", description: "Alex Oostendurp's visual diary: drawings, objects, playlists and a rodeo." },
  },
  theme: seedTheme,
  nav: {
    style: "pill",
    logoText: "aoost",
    showLogoMark: true,
    hideOnScroll: true,
    currentMarker: "pill",
    items: [
      { id: "nav-work", type: "page", target: { kind: "page", pageId: "work" }, showOn: "both", hover: "tint" },
      { id: "nav-diary", type: "page", target: { kind: "page", pageId: "diary" }, showOn: "both", hover: "tint" },
      { id: "nav-playlists", type: "page", target: { kind: "page", pageId: "playlists" }, showOn: "both", hover: "tint" },
      { id: "nav-rodeo", type: "page", target: { kind: "page", pageId: "rodeo" }, showOn: "both", hover: "tint" },
      { id: "nav-about", type: "page", target: { kind: "page", pageId: "about" }, showOn: "both", hover: "tint" },
      { id: "nav-social", type: "social", showOn: "mobile", hover: "tint" },
    ],
  },
  globals: [
    {
      id: "footer",
      name: "Footer",
      node: node("footer-node", "Footer", { text: "Made in the small hours. © Alex Oostendurp", showSocials: true }),
    },
  ],
  templates: starterTemplates,
  collections: {
    diary: [
      { id: "entry-014", date: "2026-11-08", title: "Stars & static", text: "New sketchbook. Stars on the cover, static on the radio. Filled six pages before the tea went cold.", image: art("j-star2.jpg"), imageAlt: "Sketchbook cover with stars" },
      { id: "entry-013", date: "2026-10-31", title: "Hear no evil", text: "The ring came back from casting. Heavier than the render, which feels right.", image: art("hear-no-evil-ring.png"), imageAlt: "Hear no evil ring" },
      { id: "entry-012", date: "2026-10-19", title: "Flower skull", text: "Drew this one in a single sitting. Left the mistakes in.", image: art("flower-skull.png"), imageAlt: "Flower skull drawing" },
    ],
    playlists: [
      { id: "pl-rock", title: "Rock", spotify: "2FeVxQ6ZPLOAuoejGJj9Fb", cover: art("cover-disc1.jpg") },
      { id: "pl-alt", title: "Alt", spotify: "3PbXJWUZ4RooUU0aSSdDi0", cover: art("cover-disc2.jpg") },
      { id: "pl-htr", title: "H | T | R", spotify: "6KYCNr0X6Zt189pYxHMx1j", cover: art("cover-disc3.jpg") },
    ],
  },
  cms: [],
  pages: [
    aoostHome,
    galleryPage("work", "Work", "/work", null, "Two bodies of work: things made on a screen, and things you can drop on your foot.", [
      ["hero.jpg", "Studio piece"],
      ["grillz.jpg", "Grillz"],
      ["storefront.png", "Storefront"],
      ["monkey-figure.jpg", "Monkey figure"],
    ]),
    galleryPage("digital", "Digital", "/work/digital", "work", "Screen work.", [
      ["hero.jpg", "Studio piece"],
      ["storefront.png", "Storefront"],
      ["hear-no-evil-3d.png", "Hear no evil, 3D"],
      ["flower-skull.png", "Flower skull"],
    ]),
    galleryPage("physical", "Physical", "/work/physical", "work", "Ink, metal and print.", [
      ["grillz.jpg", "Grillz"],
      ["monkey-figure.jpg", "Monkey figure"],
      ["hear-no-evil-ring.png", "Hear no evil ring"],
      ["keychain.png", "Keychain"],
    ]),
    simplePage("diary", "Diary", "/diary", [node("diary-list", "DiaryList", { limit: 0, showImages: true }, { margin: "20px 0 0" })], { template: "diary" }),
    simplePage(
      "playlists",
      "Playlists",
      "/playlists",
      [
        text("playlists-blurb", "body", "Pick a playlist. The station's still on.", { color: "token:text" }),
        node("playlists-cards", "PlaylistCard", { source: "all", playlistId: "" }, { margin: "20px 0 0" }),
      ],
      { template: "playlist" },
    ),
    simplePage("rodeo", "Rodeo", "/rodeo", [
      text("rodeo-blurb", "body", "The lasso game and its leaderboard still live on the current site until the cut-over.", { color: "token:text", maxWidth: "520px" }),
      image("rodeo-art", "/seed/scorpion.svg", "Line drawing of a scorpion", { width: "200px", margin: "12px 0" }, { lightbox: false }),
      node("rodeo-cta", "Button", { label: "Play the rodeo", target: { kind: "url", url: "https://alexoostendurp.com/" }, variant: "outline", newTab: true }),
    ]),
    simplePage("about", "About", "/about", [
      text("about-body", "body", "Alex Oostendurp draws, builds small objects and keeps a diary in public. This is where it all lands.", { color: "token:text", maxWidth: "560px" }),
      image("about-art", "/seed/sun.svg", "Line drawing of a sun", { width: "72px", margin: "16px 0 0" }, { lightbox: false }),
    ]),
    simplePage(
      "links",
      "Links",
      "/links",
      [
        node("links-ig", "Button", { label: "Instagram", target: { kind: "url", url: "https://www.instagram.com/" }, variant: "outline", newTab: true }, { width: "100%", margin: "16px 0 0" }),
        node("links-work", "Button", { label: "Work", target: { kind: "page", pageId: "work" }, variant: "outline" }, { width: "100%" }),
        node("links-diary", "Button", { label: "Diary", target: { kind: "page", pageId: "diary" }, variant: "outline" }, { width: "100%" }),
        node("links-playlists", "Button", { label: "Playlists", target: { kind: "page", pageId: "playlists" }, variant: "filled" }, { width: "100%" }),
      ],
      { showInNav: false, seo: { title: "aoost links" } },
    ),
    samplePage,
  ],
  redirects: [],
};

import { z } from "zod";
import { responsive } from "./responsive";
import { Color, Length, ResponsiveFrameFit, ResponsiveStyle } from "./style";

const Id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "ids use letters, digits, _ and -");
/** A page path: "/" or "/work/digital". One nesting level in v1. */
export const Slug = z.string().regex(/^\/$|^(\/[a-z0-9]+(-[a-z0-9]+)*){1,2}$/, "not a valid page URL");

// ---------------------------------------------------------------- nodes

export const ScrollEffects = z.object({
  enter: z.enum(["none", "fade", "slide-up", "slide-left", "slide-right", "scale"]).optional(),
  /** -1..1: fraction of scroll distance the node drifts by. 0 = off. */
  parallax: z.number().min(-1).max(1).optional(),
  /** Slow pan (the Ken Burns effect): the picture keeps drifting this way, back and forth. */
  pan: z.enum(["left", "right", "in", "out"]).optional(),
  /** Seconds for one sweep of the slow pan. */
  panSeconds: z.number().min(4).max(3600).optional(),
  sticky: z.boolean().optional(),
  stickyTop: z.number().optional(),
});

export interface Node {
  id: string;
  type: string;
  /** Layers-panel name. Falls back to the type. */
  name?: string;
  locked?: boolean;
  /** Content is shared across breakpoints. Validated per component type. */
  content: Record<string, unknown>;
  style: z.infer<typeof ResponsiveStyle>;
  frame?: z.infer<typeof ResponsiveFrameFit>;
  effects?: z.infer<typeof ScrollEffects>;
}

export const Node: z.ZodType<Node> = z.object({
  id: Id,
  type: z.string().min(1),
  name: z.string().optional(),
  locked: z.boolean().optional(),
  content: z.record(z.string(), z.unknown()),
  style: ResponsiveStyle,
  frame: ResponsiveFrameFit.optional(),
  effects: ScrollEffects.optional(),
});

// ------------------------------------------------------------- sections

export const SectionBackground = z.object({
  color: Color.optional(),
  image: z.string().optional(),
  video: z.string().optional(),
  /** Still image shown instead of the video on phones. */
  poster: z.string().optional(),
  overlay: Color.optional(),
});

export const SectionLayout = z.object({
  /** Grid: column and row counts. Flow uses columns = 1. */
  columns: z.number().int().min(1).max(12),
  rows: z.number().int().min(1).max(12).optional(),
  gap: z.number().min(0),
  /** CSS padding shorthand in px, e.g. "64px 20px". */
  padding: z.string(),
  minHeight: Length.optional(),
  /** Inner content width cap in px. Omit for full bleed. */
  maxWidth: z.number().min(200).optional(),
  /** Canvas: the artboard height in design px for this breakpoint. */
  height: z.number().min(40).optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  justify: z.enum(["start", "center", "end", "stretch"]).optional(),
  background: SectionBackground.optional(),
  hidden: z.boolean().optional(),
});
export type SectionLayout = z.infer<typeof SectionLayout>;

export const Section = z.object({
  id: Id,
  kind: z.enum(["flow", "grid", "canvas"]),
  name: z.string().optional(),
  locked: z.boolean().optional(),
  layout: responsive(SectionLayout),
  /** Canvas only: true once Alex has laid desktop out by hand (no auto-scaling). */
  customDesktop: z.boolean().optional(),
  children: z.array(Node),
});
export type Section = z.infer<typeof Section>;

export const OverlayPlace = z.object({
  h: z.enum(["left", "center", "right"]),
  v: z.enum(["top", "center", "bottom"]),
  dx: z.number(),
  dy: z.number(),
  width: z.number().min(1),
});
export const Overlay = z.object({
  id: Id,
  node: Node,
  /** Straddle a section edge, or float over the viewport. */
  anchor: z.union([z.object({ sectionId: Id, edge: z.enum(["top", "bottom"]) }), z.literal("viewport")]),
  place: responsive(OverlayPlace),
  sticky: z.boolean().optional(),
  z: z.number().int(),
});
export type Overlay = z.infer<typeof Overlay>;

// ---------------------------------------------------------------- pages

export const Seo = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

export const Page = z.object({
  id: Id,
  title: z.string().min(1),
  slug: Slug,
  parentId: Id.nullable(),
  status: z.enum(["published", "draft", "unlisted"]),
  template: z.string(),
  seo: Seo,
  isHome: z.boolean(),
  showInNav: z.boolean(),
  /** Leave the site navigation off this page (a one-page layout that brings its own header). */
  hideNav: z.boolean().optional(),
  sections: z.array(Section),
  overlays: z.array(Overlay).default([]),
  /** A variant: a copy of the page with this id to try ideas on. Never built into the site (always status "draft"). */
  variantOf: Id.optional(),
  /**
   * What kind of page: an ordinary page, a campaign page (events, emails: reached by link only,
   * kept out of the nav, search and sitemap, and taken down on `unpublishAt`) or a blog post.
   */
  kind: z.enum(["page", "campaign", "post"]).optional(),
  /** Campaign pages: the day (YYYY-MM-DD) after which the live page answers "gone". */
  unpublishAt: z.string().date().optional(),
  /** Blog posts: the date shown and sorted by, a cover picture and a short summary for lists. */
  post: z.object({ date: z.string().date(), cover: z.string().optional(), coverAlt: z.string().optional(), excerpt: z.string().optional() }).optional(),
  /** The variant's name ("Variant 1", "Spring hero"). */
  variantName: z.string().min(1).max(60).optional(),
  /** Variant block id → the page's block id it was copied from, so electing gives blocks back their ids. */
  variantIds: z.record(z.string(), z.string()).optional(),
});
export type Page = z.infer<typeof Page>;

// ------------------------------------------------------------------ nav

export const LinkTarget = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("page"), pageId: Id }),
  z.object({ kind: z.literal("section"), pageId: Id, sectionId: Id }),
  z.object({ kind: z.literal("url"), url: z.string().min(1) }),
  z.object({ kind: z.literal("email"), email: z.string().email() }),
]);
export type LinkTarget = z.infer<typeof LinkTarget>;

export const NAV_ITEM_TYPES = ["page", "section", "external", "dropdown", "mega", "button", "social", "search", "embed", "label"] as const;

export interface NavItem {
  id: string;
  type: (typeof NAV_ITEM_TYPES)[number];
  /** Page links fall back to the page title when this is empty. */
  label?: string;
  target?: LinkTarget;
  icon?: { name: string; position: "none" | "left" | "right" };
  badge?: { text: string; expires?: string };
  showOn: "both" | "desktop" | "mobile";
  hover: "tint" | "underline" | "none";
  newTab?: boolean;
  /** A line under the label in a dropdown ("Precise fruit sizing & size forecasting"). */
  description?: string;
  ariaLabel?: string;
  /** dropdown: "auto" lists the sub-pages of `target` (a page); "manual" uses `children`. */
  source?: "auto" | "manual";
  children?: NavItem[];
  /** mega: a panel built with the page editor. */
  panel?: Section[];
  /** button */
  variant?: "filled" | "outline";
  /** embed/code: runs sandboxed. */
  code?: string;
  /** label: render as a divider line instead of a heading. */
  divider?: boolean;
}

export const NavItem: z.ZodType<NavItem> = z.object({
  id: Id,
  type: z.enum(NAV_ITEM_TYPES),
  label: z.string().optional(),
  target: LinkTarget.optional(),
  icon: z.object({ name: z.string(), position: z.enum(["none", "left", "right"]) }).optional(),
  badge: z.object({ text: z.string().min(1), expires: z.string().date().optional() }).optional(),
  showOn: z.enum(["both", "desktop", "mobile"]),
  hover: z.enum(["tint", "underline", "none"]),
  newTab: z.boolean().optional(),
  description: z.string().optional(),
  ariaLabel: z.string().optional(),
  source: z.enum(["auto", "manual"]).optional(),
  get children() {
    return z.array(NavItem).optional();
  },
  panel: z.array(Section).optional(),
  variant: z.enum(["filled", "outline"]).optional(),
  code: z.string().optional(),
  divider: z.boolean().optional(),
});

export const NavConfig = z.object({
  /** Only "pill" ships in v1; the renderer is pluggable (SPEC §6). */
  style: z.string(),
  logoText: z.string(),
  showLogoMark: z.boolean(),
  /** A logo picture in place of the symbol and text. */
  logoImage: z.string().optional(),
  /** The bar style's accent: links on hover, buttons. */
  accent: z.string().optional(),
  hideOnScroll: z.boolean(),
  currentMarker: z.enum(["pill", "underline", "none"]),
  items: z.array(NavItem),
});
export type NavConfig = z.infer<typeof NavConfig>;

// ---------------------------------------------------------------- theme

export const TypeStyle = z.object({
  name: z.string(),
  font: z.enum(["display", "body", "mono"]),
  /** Font size in px: mobile base, optional desktop override. */
  size: z.object({ base: z.number().min(6).max(400), desktop: z.number().min(6).max(400).optional() }),
  weight: z.number().min(100).max(900),
  lineHeight: z.number().min(0.6).max(3),
  /** Letter spacing in em. */
  tracking: z.number().min(-0.2).max(1),
  uppercase: z.boolean().optional(),
});
export type TypeStyle = z.infer<typeof TypeStyle>;

export const FontFace = z.object({
  family: z.string().min(1),
  src: z.string().min(1),
  weight: z.string().default("400"),
  style: z.enum(["normal", "italic"]).default("normal"),
});

export const Theme = z.object({
  colors: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/), z.string()),
  fonts: z.object({ display: z.string(), body: z.string(), mono: z.string() }),
  /** Uploaded fonts (@font-face). */
  fontFaces: z.array(FontFace),
  /** Google Fonts families to load, e.g. "Space Grotesk:wght@500;700". */
  googleFonts: z.array(z.string()),
  typeStyles: z.record(z.string(), TypeStyle),
  radii: z.record(z.string(), z.number()),
  spacing: z.record(z.string(), z.number()),
});
export type Theme = z.infer<typeof Theme>;

// ----------------------------------------------------------------- site

export const Social = z.object({ network: z.string(), url: z.string().url(), label: z.string().optional() });

export const SiteSettings = z.object({
  title: z.string(),
  socials: z.array(Social),
  defaultSeo: Seo,
  favicon: z.string().optional(),
});

export const GlobalComponent = z.object({ id: Id, name: z.string(), node: Node });
export type GlobalComponent = z.infer<typeof GlobalComponent>;

export const Template = z.object({
  id: Id,
  name: z.string(),
  kind: z.enum(["section", "page"]),
  sections: z.array(Section),
});
export type Template = z.infer<typeof Template>;

export const Redirect = z.object({ from: z.string().startsWith("/"), to: z.string().startsWith("/") });
export type Redirect = z.infer<typeof Redirect>;

export const DiaryEntry = z.object({
  id: Id,
  date: z.string().date(),
  title: z.string(),
  text: z.string(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
});
export type DiaryEntry = z.infer<typeof DiaryEntry>;

export const Playlist = z.object({
  id: Id,
  title: z.string(),
  /** Spotify playlist URL or id. */
  spotify: z.string(),
  cover: z.string().optional(),
  note: z.string().optional(),
});
export type Playlist = z.infer<typeof Playlist>;

export const Collections = z.object({ diary: z.array(DiaryEntry), playlists: z.array(Playlist) });

export const Site = z.object({
  settings: SiteSettings,
  theme: Theme,
  nav: NavConfig,
  globals: z.array(GlobalComponent),
  templates: z.array(Template),
  collections: Collections,
  pages: z.array(Page),
  redirects: z.array(Redirect),
});
export type Site = z.infer<typeof Site>;

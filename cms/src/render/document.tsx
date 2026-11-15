import { renderToStaticMarkup } from "react-dom/server";
import { getComponent } from "../components/registry";
import type { NavItem, Node, Page, Section, Site } from "../schema";
import { addNodeCss, addSectionCss, Sheet, themeCss } from "../responsive/css";
import { baseCss } from "./base.styles";
import { makeCtx } from "./context";
import { navRenderer } from "./nav";
import { addOverlayCss } from "./overlay-css";
import { OverlayView, SectionView } from "./SectionView";

export type RenderOptions = {
  /** Absolute origin for canonical and share URLs, e.g. "https://alexoostendurp.com". */
  siteUrl?: string;
  /** Draft preview served by the Worker: links stay under this prefix and nothing is indexed. */
  preview?: { prefix: string };
  /** Cache-busting suffix for /assets/site.js. */
  assetVersion?: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function navPanels(items: NavItem[]): Section[] {
  return items.flatMap((i) => [...(i.panel ?? []), ...navPanels(i.children ?? [])]);
}

/** Every node that will be drawn for this page, with globals resolved. */
function nodesOf(site: Site, page: Page): Node[] {
  const direct = [...page.sections, ...navPanels(site.nav.items)].flatMap((s) => s.children).concat(page.overlays.map((o) => o.node));
  const out: Node[] = [];
  for (const n of direct) {
    out.push(n);
    if (n.type === "Global") {
      const g = site.globals.find((x) => x.id === n.content.globalId);
      if (g) out.push(g.node);
    }
  }
  return out;
}

/** All CSS for one page: tokens, base, nav, the components it uses, and its layout rules. */
export function pageCss(site: Site, page: Page): string {
  const sheet = new Sheet();
  for (const s of [...page.sections, ...navPanels(site.nav.items)]) addSectionCss(sheet, s);
  for (const o of page.overlays) {
    addOverlayCss(sheet, o);
    addNodeCss(sheet, o.node);
  }
  for (const g of site.globals) addNodeCss(sheet, g.node);

  const used = new Set(nodesOf(site, page).map((n) => n.type));
  used.add("Image"); // .frame is shared by every media component
  const componentCss = [...used].map((t) => getComponent(t)?.css ?? "").join("");
  return [themeCss(site.theme), baseCss, navRenderer(site.nav.style).css, componentCss, sheet.toString()].join("\n").replace(/\n\s*\n/g, "\n").trim();
}

export function pageTitle(site: Site, page: Page): string {
  if (page.seo.title) return page.seo.title;
  return page.isHome ? (site.settings.defaultSeo.title ?? site.settings.title) : `${page.title} · ${site.settings.title}`;
}

/** Preload the first uploaded font: it is the display face, used above the fold. */
function fontPreload(site: Site): string {
  const face = site.theme.fontFaces[0];
  if (!face) return "";
  const type = /\.woff2(\?|$)/.test(face.src) ? "font/woff2" : /\.woff(\?|$)/.test(face.src) ? "font/woff" : /\.ttf(\?|$)/.test(face.src) ? "font/ttf" : "font/otf";
  return `<link rel="preload" as="font" type="${type}" href="${esc(face.src)}" crossorigin>`;
}

function fontLinks(site: Site): string {
  if (!site.theme.googleFonts.length) return "";
  const families = site.theme.googleFonts.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+").replace(/%3A/g, ":").replace(/%40/g, "@").replace(/%3B/g, ";")}`).join("&");
  return (
    `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    // Loaded without blocking first paint: text shows in the fallback font, then swaps.
    `<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?${esc(families)}&display=swap" onload="this.onload=null;this.rel='stylesheet'">` +
    `<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${esc(families)}&display=swap"></noscript>`
  );
}

export function PageBody({ site, page, opts = {} }: { site: Site; page: Page; opts?: RenderOptions }) {
  const ctx = makeCtx(site, page, { prefix: opts.preview?.prefix });
  const Nav = navRenderer(site.nav.style).Render;
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav ctx={ctx} />
      <main id="main">
        {page.sections.map((s) => (
          <SectionView key={s.id} section={s} ctx={ctx} overlays={page.overlays.filter((o) => o.anchor !== "viewport" && o.anchor.sectionId === s.id)} />
        ))}
        {page.overlays
          .filter((o) => o.anchor === "viewport")
          .map((o) => (
            <OverlayView key={o.id} overlay={o} ctx={ctx} />
          ))}
      </main>
    </>
  );
}

/** A complete static HTML document for one page. */
export function renderPage(site: Site, page: Page, opts: RenderOptions = {}): string {
  const title = pageTitle(site, page);
  const description = page.seo.description ?? site.settings.defaultSeo.description ?? "";
  const image = page.seo.image ?? site.settings.defaultSeo.image;
  const abs = (path: string) => (opts.siteUrl && path.startsWith("/") ? opts.siteUrl.replace(/\/$/, "") + path : path);
  const noindex = !!opts.preview || page.status !== "published";
  const v = opts.assetVersion ? `?v=${esc(opts.assetVersion)}` : "";

  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    description ? `<meta name="description" content="${esc(description)}">` : "",
    noindex ? `<meta name="robots" content="noindex">` : "",
    opts.siteUrl && !noindex ? `<link rel="canonical" href="${esc(abs(page.slug))}">` : "",
    `<meta property="og:title" content="${esc(title)}">`,
    description ? `<meta property="og:description" content="${esc(description)}">` : "",
    `<meta property="og:type" content="website">`,
    image ? `<meta property="og:image" content="${esc(abs(image))}"><meta name="twitter:card" content="summary_large_image">` : "",
    `<meta name="theme-color" content="${esc(site.theme.colors.bone ?? "#F3EFE6")}">`,
    site.settings.favicon ? `<link rel="icon" href="${esc(site.settings.favicon)}">` : `<link rel="icon" href="/seed/sun.svg" type="image/svg+xml">`,
    fontPreload(site),
    fontLinks(site),
    `<style>${pageCss(site, page)}</style>`,
    `<script>document.documentElement.classList.add("js")</script>`,
    `<script defer src="/assets/site.js${v}"></script>`,
  ]
    .filter(Boolean)
    .join("\n");

  const body = renderToStaticMarkup(<PageBody site={site} page={page} opts={opts} />);
  const search = opts.preview ? ` data-search="${esc(opts.preview.prefix)}/search.json"` : "";
  return `<!doctype html>\n<html lang="en"${search}>\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

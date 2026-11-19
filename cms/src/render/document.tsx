import { renderToStaticMarkup } from "react-dom/server";
import { getComponent } from "../components/registry";
import type { ComponentKit } from "../components/types";
import type { NavItem, Node, Page, Section, Site } from "../schema";
import { addSlotCss } from "../components/aoost/frames";
import { addNodeCss, addSectionCss, Sheet, themeCss } from "../responsive/css";
import { baseCss } from "./base.styles";
import { makeCtx } from "./context";
import { navRenderer } from "./nav";
import { addOverlayCss } from "./overlay-css";
import { DEFAULT_SHARE_IMAGE } from "./share";
import { OverlayView, SectionView } from "./SectionView";

export type RenderOptions = {
  /** Absolute origin for canonical and share URLs, e.g. "https://alexoostendurp.com". */
  siteUrl?: string;
  /** Draft preview served by the Worker: links stay under this prefix and nothing is indexed. */
  preview?: { prefix: string };
  /** Cache-busting suffix for /assets/site.js. */
  assetVersion?: string;
  /** Origin for the share tags (og:url, og:image) when siteUrl isn't set, e.g. from the CNAME file. */
  shareOrigin?: string;
};


/** Favicons made from the clover (scripts/make-icons.ts), unless a custom one is set. */
function iconLinks(site: Site): string {
  if (site.settings.favicon) return `<link rel="icon" href="${esc(site.settings.favicon)}">`;
  return (
    `<link rel="icon" href="/favicon.ico" sizes="any">` +
    `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">` +
    `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">` +
    `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`
  );
}

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

/** The kits (shared CSS, fonts, script) of the components a page uses. */
export function pageKits(site: Site, page: Page): ComponentKit[] {
  const kits = new Map<string, ComponentKit>();
  for (const n of nodesOf(site, page)) {
    const kit = getComponent(n.type)?.kit;
    if (kit) kits.set(kit.id, kit);
  }
  return [...kits.values()];
}

/** Sections grouped into bands: runs of sections whose first component names the same band share one wrapper. */
export function bandsOf(page: Page): { band?: string; sections: Section[] }[] {
  const groups: { band?: string; sections: Section[] }[] = [];
  for (const section of page.sections) {
    const first = section.children[0];
    const def = first ? getComponent(first.type) : undefined;
    const band = def?.band?.({ ...(def.defaults.content as object), ...first!.content }) || undefined;
    const last = groups[groups.length - 1];
    if (band && last?.band === band) last.sections.push(section);
    else groups.push({ band, sections: [section] });
  }
  return groups;
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
  // Pictures framed inside a block's content (the aoost blocks); only items with a frame add rules.
  for (const n of nodesOf(site, page)) {
    const def = getComponent(n.type);
    if (def?.frames) addSlotCss(sheet, n.id, def.frames({ ...(def.defaults.content as object), ...n.content }));
  }

  const used = new Set(nodesOf(site, page).map((n) => n.type));
  used.add("Image"); // .frame is shared by every media component
  const componentCss = [...used].map((t) => getComponent(t)?.css ?? "").join("");
  const kits = pageKits(site, page);
  return [
    themeCss(site.theme),
    baseCss,
    page.hideNav ? "" : navRenderer(site.nav.style).css,
    kits.map((k) => k.css).join(""),
    componentCss,
    kits.map((k) => k.cssAfter ?? "").join(""),
    sheet.toString(),
  ]
    .join("\n")
    .replace(/\n\s*\n/g, "\n")
    .trim();
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

function fontLinks(site: Site, extra: string[] = [], blocking = false): string {
  // Families the page's components need join the theme's; the same family is requested once, with all its weights.
  const byFamily = new Map<string, Set<string>>();
  for (const spec of [...site.theme.googleFonts, ...extra]) {
    const [family, axis] = spec.split(":wght@");
    const set = byFamily.get(family!) ?? new Set<string>();
    for (const w of (axis ?? "400").split(";")) set.add(w);
    byFamily.set(family!, set);
  }
  const specs = [...byFamily].map(([family, weights]) => `${family}:wght@${[...weights].sort().join(";")}`);
  if (!specs.length) return "";
  const families = specs.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+").replace(/%3A/g, ":").replace(/%40/g, "@").replace(/%3B/g, ";")}`).join("&");
  return (
    `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    (blocking
      ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${esc(families)}&display=swap">`
      : // Loaded without blocking first paint: text shows in the fallback font, then swaps.
        `<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?${esc(families)}&display=swap" onload="this.onload=null;this.rel='stylesheet'">` +
        `<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${esc(families)}&display=swap"></noscript>`)
  );
}

/** The page's body. `editing` draws the editor's first-paint versions (the editor's side-by-side frames use it). */
export function PageBody({ site, page, opts = {}, editing = false }: { site: Site; page: Page; opts?: RenderOptions; editing?: boolean }) {
  const ctx = makeCtx(site, page, { prefix: opts.preview?.prefix, editing });
  const Nav = navRenderer(site.nav.style).Render;
  const mainClass = pageKits(site, page).map((k) => k.mainClass).filter(Boolean).join(" ") || undefined;
  const view = (s: Section) => <SectionView key={s.id} section={s} ctx={ctx} overlays={page.overlays.filter((o) => o.anchor !== "viewport" && o.anchor.sectionId === s.id)} />;
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {page.hideNav ? null : <Nav ctx={ctx} />}
      <main id="main" className={mainClass}>
        {bandsOf(page).map((g) =>
          g.band ? (
            <div key={g.sections[0]!.id} className={g.band}>
              {g.sections.map(view)}
            </div>
          ) : (
            g.sections.map(view)
          ),
        )}
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
  // No description text anywhere: the site stays barely there (SHARE-VIEWER.md).
  const image = page.seo.image || site.settings.defaultSeo.image || DEFAULT_SHARE_IMAGE;
  const origin = (opts.siteUrl || opts.shareOrigin || "").replace(/\/$/, "");
  const abs = (path: string) => (opts.siteUrl && path.startsWith("/") ? opts.siteUrl.replace(/\/$/, "") + path : path);
  const share = (path: string) => (origin && path.startsWith("/") ? origin + path : path);
  const noindex = !!opts.preview || page.status !== "published";
  const v = opts.assetVersion ? `?v=${esc(opts.assetVersion)}` : "";
  const kits = pageKits(site, page);

  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    noindex ? `<meta name="robots" content="noindex">` : "",
    opts.siteUrl && !noindex ? `<link rel="canonical" href="${esc(abs(page.slug))}">` : "",
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(share(page.slug))}">`,
    `<meta property="og:image" content="${esc(share(image))}">`,
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="theme-color" content="${esc(site.theme.colors.bone ?? "#F3EFE6")}">`,
    iconLinks(site),
    fontPreload(site),
    fontLinks(site, kits.flatMap((k) => k.googleFonts ?? []), kits.some((k) => k.blockingFonts)),
    `<style>${pageCss(site, page)}</style>`,
    `<script>document.documentElement.classList.add("js")</script>`,
    `<script defer src="/assets/site.js${v}"></script>`,
    ...kits.filter((k) => k.script).map((k) => `<script defer src="${esc(k.script!)}${v}"></script>`),
  ]
    .filter(Boolean)
    .join("\n");

  const body = renderToStaticMarkup(<PageBody site={site} page={page} opts={opts} />);
  const search = opts.preview ? ` data-search="${esc(opts.preview.prefix)}/search.json"` : "";
  const previewFlag = opts.preview ? ' data-preview=""' : "";
  return `<!doctype html>\n<html lang="en"${search}${previewFlag}>\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

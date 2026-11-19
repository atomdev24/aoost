import { describe, expect, it } from "vitest";
import { Site, type Site as SiteT } from "../schema";
import { fixtureSite as seedSite } from "../seed/fixture";
import { buildSite, outputPath, searchIndex } from "./build";
import { makeCtx } from "./context";
import { pageCss, pageTitle, renderPage } from "./document";
import { inline } from "./inline";
import { hrefFor, safeUrl } from "./links";
import { imageSources } from "./media";
import { badgeFor, resolveNav } from "./nav";
import { flattenRedirects, redirectsFile } from "./redirects";
import { sandboxDoc } from "./sandbox";
import { renderToStaticMarkup } from "react-dom/server";

const site = Site.parse(seedSite);
const clone = (): SiteT => Site.parse(JSON.parse(JSON.stringify(seedSite)));
const page = (id: string, s = site) => s.pages.find((p) => p.id === id)!;

describe("output paths", () => {
  it("maps slugs to clean-URL files", () => {
    expect(outputPath("/")).toBe("index.html");
    expect(outputPath("/work")).toBe("work.html");
    expect(outputPath("/work/digital")).toBe("work/digital.html");
  });
});

describe("renderPage", () => {
  const html = renderPage(site, page("home"), { siteUrl: "https://example.com" });

  it("is a complete static document with inline CSS and one deferred script", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>aoost</title>");
    expect(html).toContain('<link rel="canonical" href="https://example.com/">');
    expect(html.match(/<script/g)).toHaveLength(2);
    expect(html).toContain('<script defer src="/assets/site.js"></script>');
    expect(html).not.toContain("data-reactroot");
  });
  it("renders sections of every kind with their layout CSS", () => {
    expect(html).toContain('<section id="home-hero" class="s s-home-hero" data-kind="flow">');
    expect(html).toContain('data-kind="canvas"');
    expect(html).toContain('data-kind="grid"');
    expect(html).toMatch(/\.s-home-latest>\.si\{[^}]*grid-template-columns:repeat\(1, minmax\(0, 1fr\)\)/);
    expect(html).toMatch(/@media \(min-width:900px\)\{[^]*\.s-home-latest>\.si\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  });
  it("uses theme text styles and tokens", () => {
    expect(html).toContain('<h1 class="tx t-hero">A visual diary, for people in the know.</h1>');
    expect(html).toContain("--c-rust:#B5421A");
    expect(html).toContain(".n-home-kicker{color:var(--c-muted)}");
  });
  it("resolves global components in place", () => {
    expect(html).toContain('<footer class="ft">');
    expect(html).toContain("Made in the small hours.");
  });
  it("lazy-loads images with alt text", () => {
    expect(html).toContain('alt="Artwork from the studio"');
    expect(html).toContain('loading="lazy"');
  });
  it("marks the current page in the nav", () => {
    const work = renderPage(site, page("digital"));
    expect(work).toMatch(/<a class="pill-link hv-tint pill-split" href="\/work" aria-current="page">/);
    expect(work).toMatch(/<a class="menu-link" role="menuitem" href="\/work\/digital" aria-current="page">/);
  });
  it("only includes CSS for components the page uses", () => {
    expect(pageCss(site, page("about"))).not.toContain(".gal{");
    expect(pageCss(site, page("work"))).toContain(".gal{");
  });
  it("noindexes unlisted pages and previews, and prefixes preview links", () => {
    const s = clone();
    page("links", s).status = "unlisted";
    expect(renderPage(s, page("links", s))).toContain('<meta name="robots" content="noindex">');
    const preview = renderPage(site, page("home"), { preview: { prefix: "/preview" } });
    expect(preview).toContain('href="/preview/work"');
    expect(preview).toContain('content="noindex"');
  });
  it("builds titles", () => {
    expect(pageTitle(site, page("work"))).toBe("Work · aoost");
    expect(pageTitle(site, page("links"))).toBe("aoost links");
  });
  it("escapes content", () => {
    const s = clone();
    (page("about", s).sections[0]!.children[1]!.content as { text: string }).text = '<script>alert(1)</script> "x"';
    page("about", s).seo.title = '"><script>';
    const out = renderPage(s, page("about", s));
    expect(out).not.toContain("<script>alert(1)");
    expect(out).toContain("&lt;script&gt;alert(1)");
    expect(out).toContain('content="&quot;&gt;&lt;script&gt;"');
  });
});

describe("share preview and favicon", () => {
  const home = buildSite(site, { shareOrigin: "https://alexoostendurp.com" })["index.html"]!;
  it("puts the Open Graph and Twitter tags on a built page, with the clover image by default", () => {
    expect(home).toContain('<meta property="og:title" content="aoost">');
    expect(home).toContain('<meta property="og:type" content="website">');
    expect(home).toContain('<meta property="og:url" content="https://alexoostendurp.com/">');
    expect(home).toContain('<meta property="og:image" content="https://alexoostendurp.com/og.png">');
    expect(home).toContain('<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">');
    expect(home).toContain('<meta name="twitter:card" content="summary_large_image">');
  });
  it("has no description text, even when one is set", () => {
    const s = clone();
    page("home", s).seo.description = "Something";
    s.settings.defaultSeo.description = "Something else";
    const out = renderPage(s, page("home", s));
    expect(out).not.toMatch(/description/);
  });
  it("uses the share image from the site settings, and the page's own over that", () => {
    const s = clone();
    s.settings.defaultSeo.image = "/media/share.jpg";
    expect(renderPage(s, page("work", s), { shareOrigin: "https://x.com" })).toContain('<meta property="og:image" content="https://x.com/media/share.jpg">');
    page("work", s).seo.image = "/media/work.jpg";
    expect(renderPage(s, page("work", s), { shareOrigin: "https://x.com" })).toContain('content="https://x.com/media/work.jpg"');
  });
  it("links the clover favicons and the apple-touch icon", () => {
    expect(home).toContain('<link rel="icon" href="/favicon.ico" sizes="any">');
    expect(home).toContain('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">');
    expect(home).toContain('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">');
    expect(home).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
  });
});

describe("404: the clover", () => {
  const nf = buildSite(site)["404.html"]!;
  it("is the clover on black with 404 · back to /, titled aoost, and no other text", () => {
    expect(nf).toContain("<title>aoost</title>");
    expect(nf).toContain('<img class="nf-clover" src="/art/app-icon-512.png" width="200" height="200" alt="">');
    expect(nf).toContain('<p class="nf-line">404 · <a href="/">back</a></p>');
    expect(nf).toContain("background:#000");
    expect(nf).toMatch(/animation:nf-turn 40s linear infinite/);
    expect(nf).toMatch(/prefers-reduced-motion:reduce\)\{\.nf-clover\{animation:none\}/);
    const text = nf.replace(/<head>[^]*<\/head>/, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(text).toBe("404 · back");
  });
  it("carries the share tags and favicons too", () => {
    expect(nf).toContain('<meta property="og:title" content="aoost">');
    expect(nf).toContain('<link rel="icon" href="/favicon.ico" sizes="any">');
  });
});

describe("buildSite", () => {
  it("builds published and unlisted pages, never drafts", () => {
    const s = clone();
    page("about", s).status = "draft";
    page("links", s).status = "unlisted";
    const files = buildSite(s);
    expect(files["about.html"]).toBeUndefined();
    expect(files["links.html"]).toBeDefined();
    expect(Object.keys(files)).toEqual(expect.arrayContaining(["index.html", "work.html", "work/digital.html", "404.html", "_redirects", "search.json", "robots.txt"]));
    expect(files["index.html"]).not.toContain(">About<");
  });
  it("writes a sitemap of published pages when the site URL is known", () => {
    const s = clone();
    page("links", s).status = "unlisted";
    const xml = buildSite(s, { siteUrl: "https://example.com/" })["sitemap.xml"]!;
    expect(xml).toContain("<loc>https://example.com/work/digital</loc>");
    expect(xml).not.toContain("/links");
  });
  it("indexes pages, diary entries and artwork titles for search", () => {
    const index = searchIndex(site);
    expect(index).toContainEqual(expect.objectContaining({ title: "Work", url: "/work", kind: "Page" }));
    expect(index).toContainEqual(expect.objectContaining({ title: "Stars & static", url: "/diary#entry-014", kind: "Diary" }));
    expect(index).toContainEqual(expect.objectContaining({ title: "Grillz", kind: "Artwork · Work" }));
  });
});

describe("redirects", () => {
  const live = new Set(["/", "/work"]);
  it("collapses chains", () => {
    expect(flattenRedirects([{ from: "/a", to: "/b" }, { from: "/b", to: "/work" }], live)).toEqual([
      { from: "/a", to: "/work" },
      { from: "/b", to: "/work" },
    ]);
  });
  it("drops loops and redirects shadowed by a live page", () => {
    expect(flattenRedirects([{ from: "/a", to: "/b" }, { from: "/b", to: "/a" }, { from: "/work", to: "/" }], live)).toEqual([]);
  });
  it("writes a _redirects file", () => {
    const s = clone();
    s.redirects.push({ from: "/old", to: "/work" });
    expect(redirectsFile(s)).toBe("/old /work 301\n");
  });
});

describe("links and inline text", () => {
  it("resolves link targets", () => {
    expect(hrefFor(site, { kind: "page", pageId: "digital" })).toBe("/work/digital");
    expect(hrefFor(site, { kind: "section", pageId: "home", sectionId: "home-latest" })).toBe("/#home-latest");
    expect(hrefFor(site, { kind: "email", email: "a@b.co" })).toBe("mailto:a@b.co");
    expect(hrefFor(site, { kind: "page", pageId: "ghost" })).toBe("#");
  });
  it("blocks script URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl("data:text/html,x")).toBe("#");
    expect(safeUrl("example.com/x")).toBe("https://example.com/x");
    expect(safeUrl("/work")).toBe("/work");
  });
  it("formats bold, italic, links and line breaks without raw HTML", () => {
    const html = renderToStaticMarkup(<p>{inline("a **b** *c* [d](https://x.y)\n<i>")}</p>);
    expect(html).toBe('<p>a <strong>b</strong> <em>c</em> <a href="https://x.y" target="_blank" rel="noopener">d</a><br/>&lt;i&gt;</p>');
  });
  it("gives raster images a srcset; vectors are served as they are", () => {
    expect(imageSources("/media/a.jpg").srcSet).toContain("/media/a.jpg?w=480 480w");
    expect(imageSources("/media/a.svg")).toEqual({ src: "/media/a.svg" });
    // the repo's own artwork uses the WebP copies made at build time
    expect(imageSources("/art/a.jpg")).toEqual({ src: "/art/a.960.webp", srcSet: "/art/a.480.webp 480w, /art/a.960.webp 960w, /art/a.1600.webp 1600w" });
    expect(imageSources("/seed/desert.svg")).toEqual({ src: "/seed/desert.svg" });
  });
  it("keeps sandboxed code from closing its script early", () => {
    expect(sandboxDoc({ js: "x='</script><b>'" }, "f1")).not.toContain("x='</script>");
  });
});

describe("nav model", () => {
  it("gives a page with visible sub-pages an automatic dropdown", () => {
    const items = resolveNav(makeCtx(site, page("home")));
    expect(items.map((i) => i.label)).toEqual(["Work", "Diary", "Playlists", "Rodeo", "About", ""]);
    expect(items[0]!.children.map((c) => c.label)).toEqual(["Digital", "Physical"]);
  });
  it("hides pages that are drafts, unlisted or toggled out of the nav", () => {
    const s = clone();
    page("diary", s).status = "draft";
    page("rodeo", s).showInNav = false;
    page("physical", s).status = "unlisted";
    const items = resolveNav(makeCtx(s, page("home", s)));
    expect(items.map((i) => i.label)).toEqual(["Work", "Playlists", "About", ""]);
    expect(items[0]!.children.map((c) => c.label)).toEqual(["Digital"]);
  });
  it("follows the page name unless the label is overridden", () => {
    const s = clone();
    page("work", s).title = "Things";
    s.nav.items[1]!.label = "Journal";
    const items = resolveNav(makeCtx(s, page("home", s)));
    expect(items.slice(0, 2).map((i) => i.label)).toEqual(["Things", "Journal"]);
  });
  it("expires badges after their date", () => {
    const item = { ...site.nav.items[0]!, badge: { text: "New", expires: "2026-11-30" } };
    expect(badgeFor(item, "2026-11-30")).toBeDefined();
    expect(badgeFor(item, "2026-12-01")).toBeUndefined();
  });
});

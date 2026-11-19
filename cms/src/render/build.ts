import type { Page, Site } from "../schema";
import { renderPage, type RenderOptions } from "./document";
import { renderNotFound } from "./not-found";
import { redirectsFile } from "./redirects";

export type SearchEntry = { title: string; url: string; kind: string; text: string };

/** "/" → index.html, "/work" → work.html, "/work/digital" → work/digital.html */
export function outputPath(slug: string): string {
  return slug === "/" ? "index.html" : `${slug.slice(1)}.html`;
}

/** Pages that get built: published and unlisted. Drafts never leave the editor. */
export const builtPages = (site: Site): Page[] => site.pages.filter((p) => p.status !== "draft");

/** Search covers published pages, diary entries and artwork titles (SPEC §6). */
export function searchIndex(site: Site): SearchEntry[] {
  const out: SearchEntry[] = [];
  const diaryPage = site.pages.find((p) => p.status === "published" && p.sections.some((s) => s.children.some((n) => n.type === "DiaryList")));
  for (const p of site.pages.filter((x) => x.status === "published")) {
    const texts: string[] = [];
    for (const s of p.sections) {
      for (const n of s.children) {
        if (n.type === "Text" && typeof n.content.text === "string") texts.push(n.content.text);
        if (n.type === "GalleryGrid" && Array.isArray(n.content.items)) {
          for (const item of n.content.items as { title?: string; alt?: string }[]) {
            const title = item.title || item.alt;
            if (title) out.push({ title, url: p.slug, kind: `Artwork · ${p.title}`, text: "" });
          }
        }
        if (n.type === "Image" && typeof n.content.alt === "string" && n.content.alt) texts.push(n.content.alt);
      }
    }
    out.push({ title: p.title, url: p.slug, kind: "Page", text: [p.seo.description ?? "", ...texts].join(" ").slice(0, 600) });
  }
  if (diaryPage) {
    for (const e of site.collections.diary) out.push({ title: e.title, url: `${diaryPage.slug}#${e.id}`, kind: "Diary", text: e.text });
  }
  return out;
}

/** Render the whole site to a map of output path → file contents. Pure: no fs, no network. */
export function buildSite(site: Site, opts: RenderOptions = {}): Record<string, string> {
  const files: Record<string, string> = {};
  for (const page of builtPages(site)) files[outputPath(page.slug)] = renderPage(site, page, opts);
  files["404.html"] = renderNotFound(site, opts);
  files["_redirects"] = redirectsFile(site);
  files["search.json"] = JSON.stringify(searchIndex(site));
  files["robots.txt"] = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /preview\n${opts.siteUrl ? `Sitemap: ${opts.siteUrl.replace(/\/$/, "")}/sitemap.xml\n` : ""}`;
  if (opts.siteUrl) {
    const base = opts.siteUrl.replace(/\/$/, "");
    const urls = site.pages.filter((p) => p.status === "published").map((p) => `<url><loc>${base}${p.slug === "/" ? "/" : p.slug}</loc></url>`);
    files["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>\n`;
  }
  return files;
}

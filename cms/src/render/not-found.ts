import type { Page, Site } from "../schema";
import { iconLinks, shareTags, type RenderOptions } from "./document";

/** The clover the 404 shows (the same source as the share image and favicons). */
export const NOT_FOUND_CLOVER = "/art/app-icon-512.png";

const css = `
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#000;color:#fff}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;min-height:100svh;padding:24px}
.nf-clover{display:block;width:200px;height:200px;animation:nf-turn 40s linear infinite}
@keyframes nf-turn{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.nf-clover{animation:none}}
.nf-line{margin:0;font:400 12px/1 "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;color:rgba(255,255,255,.55)}
.nf-line a{color:#fff;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.35);padding-bottom:2px}
.nf-line a:hover,.nf-line a:focus-visible{border-color:#fff;outline:none}
`;

/** The 404: the clover on pure black, slowly turning, and "404 · back". No other text; the title is the site's. */
export function renderNotFound(site: Site, opts: RenderOptions = {}): string {
  const title = site.settings.title || "aoost";
  const page: Page = { id: "not-found", title, slug: "/", parentId: null, status: "unlisted", template: "blank", seo: {}, isHome: false, showInNav: false, overlays: [], sections: [] };
  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>`,
    `<meta name="robots" content="noindex">`,
    shareTags(site, page, title, opts),
    `<meta name="theme-color" content="#000000">`,
    iconLinks(site),
    `<style>${css.trim()}</style>`,
  ].join("\n");
  const home = opts.preview ? `${opts.preview.prefix}/` : "/";
  return `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n<main class="nf"><img class="nf-clover" src="${NOT_FOUND_CLOVER}" width="200" height="200" alt=""></main>\n<p class="nf-line">404 · <a href="${home}">back</a></p>\n</body>\n</html>\n`;
}

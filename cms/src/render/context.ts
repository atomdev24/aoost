import type { RenderCtx } from "../components/types";
import { mainLanguage, translatedSlug } from "../model/i18n";
import type { Page, Site } from "../schema";
import { hrefFor } from "./links";

export function makeCtx(site: Site, page: Page | null, opts: { editing?: boolean; prefix?: string } = {}): RenderCtx {
  const prefix = opts.prefix ?? "";
  // A page read in another language links to the other pages in that language where they have it.
  const lang = page?.lang && page.lang !== mainLanguage(site) ? page.lang : undefined;
  return {
    site,
    page,
    editing: !!opts.editing,
    lang,
    prefix,
    href: (target) => {
      if (lang && (target.kind === "page" || target.kind === "section")) {
        const p = site.pages.find((x) => x.id === target.pageId);
        const t = p?.translations?.[lang];
        if (p && t && (t.status === "published" || prefix)) return `${prefix}${translatedSlug(p, lang)}${target.kind === "section" ? `#${target.sectionId}` : ""}`;
      }
      return hrefFor(site, target, prefix);
    },
  };
}

import type { LinkTarget, Site } from "../schema";

/** Only let through URLs that can't run script. */
export function safeUrl(url: string): string {
  const u = url.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return "#";
  return u.includes(".") ? `https://${u}` : "#";
}

export function hrefFor(site: Site, target: LinkTarget, prefix = ""): string {
  switch (target.kind) {
    case "page": {
      const page = site.pages.find((p) => p.id === target.pageId);
      return page ? prefix + page.slug : "#";
    }
    case "section": {
      const page = site.pages.find((p) => p.id === target.pageId);
      return page ? `${prefix}${page.slug}#${target.sectionId}` : "#";
    }
    case "url":
      return safeUrl(target.url);
    case "email":
      return `mailto:${target.email}`;
  }
}

export const isExternal = (href: string) => /^https?:/i.test(href);

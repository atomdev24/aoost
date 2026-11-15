import { newId, type NavItem, type Page, type Redirect, type Site } from "../schema";
import { instantiate } from "./library";

/**
 * Page management (SPEC §5): create, rename, re-URL with automatic redirects,
 * nest, toggle in the nav, duplicate and delete. Pure functions over the site.
 */

export function slugify(name: string): string {
  const out = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "untitled";
}

const parentSlugOf = (site: Site, parentId: string | null) => {
  const parent = parentId ? site.pages.find((p) => p.id === parentId) : null;
  return parent && parent.slug !== "/" ? parent.slug : "";
};

/** A URL under the parent that no other page uses: /work/print, /work/print-2, … */
export function uniqueSlug(site: Site, segment: string, parentId: string | null, exceptId?: string): string {
  const base = `${parentSlugOf(site, parentId)}/${slugify(segment)}`;
  const taken = new Set(site.pages.filter((p) => p.id !== exceptId).map((p) => p.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

const uniqueId = (site: Site, base: string) => (site.pages.some((p) => p.id === base) ? `${base}-${newId("p").slice(2, 8)}` : base);

/**
 * Keep redirects healthy after URLs move: add the new ones, repoint anything
 * that led to an old URL, and drop any redirect that a live page now shadows.
 */
function withRedirects(site: Site, pages: Page[], moves: Redirect[]): Redirect[] {
  const live = new Set(pages.map((p) => p.slug));
  const moved = new Map(moves.map((m) => [m.from, m.to]));
  const out = new Map<string, string>();
  for (const r of site.redirects) out.set(r.from, moved.get(r.to) ?? r.to);
  for (const m of moves) out.set(m.from, m.to);
  return [...out].filter(([from, to]) => from !== to && !live.has(from)).map(([from, to]) => ({ from, to }));
}

// ---------------------------------------------------------------- nav

const mapNav = (items: NavItem[], fn: (item: NavItem) => NavItem | null): NavItem[] =>
  items.flatMap((item) => {
    const next = fn(item);
    if (!next) return [];
    return [next.children ? { ...next, children: mapNav(next.children, fn) } : next];
  });

const targetsPage = (item: NavItem, ids: Set<string>) => !!item.target && (item.target.kind === "page" || item.target.kind === "section") && ids.has(item.target.pageId);

const hasTopLevelLink = (site: Site, pageId: string) => site.nav.items.some((i) => i.type === "page" && i.target?.kind === "page" && i.target.pageId === pageId);

/**
 * "Show in navigation" (the toggle in the pages list). A top-level page gets
 * a page link in the bar; a sub-page appears in its parent's dropdown.
 */
export function setShowInNav(site: Site, pageId: string, show: boolean): Site {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page || page.isHome) return site;
  const pages = site.pages.map((p) => (p.id === pageId ? { ...p, showInNav: show } : p));
  let items = site.nav.items;
  if (!page.parentId) {
    if (show && !hasTopLevelLink(site, pageId)) {
      const link: NavItem = { id: newId("nav"), type: "page", target: { kind: "page", pageId }, showOn: "both", hover: "tint" };
      // Keep trailing utility items (socials, search, buttons) at the end of the bar.
      const lastLink = items.reduce((last, item, i) => (["page", "section", "external", "dropdown", "mega"].includes(item.type) ? i : last), -1);
      items = [...items.slice(0, lastLink + 1), link, ...items.slice(lastLink + 1)];
    } else if (!show) {
      items = items.filter((i) => !(i.type === "page" && i.target?.kind === "page" && i.target.pageId === pageId));
    }
  }
  return { ...site, pages, nav: { ...site.nav, items } };
}

// -------------------------------------------------------------- pages

export type NewPage = { name: string; templateId?: string; showInNav?: boolean; parentId?: string | null; slug?: string };

export function createPage(site: Site, input: NewPage): { site: Site; pageId: string } {
  const title = input.name.trim() || "Untitled";
  const parent = input.parentId ? site.pages.find((p) => p.id === input.parentId) : undefined;
  // Pages nest one level deep; the home page can't have sub-pages.
  const parentId = parent && !parent.parentId && !parent.isHome ? parent.id : null;
  const template = site.templates.find((t) => t.id === (input.templateId ?? "blank") && t.kind === "page") ?? site.templates.find((t) => t.id === "blank");
  const sections = instantiate(template?.sections ?? []).map((s) => ({
    ...s,
    // A fresh page's first heading starts as the page name.
    children: s.children.map((n) => (n.type === "Text" && (n.content.tag === "h1" || n.content.styleId === "h1") ? { ...n, content: { ...n.content, text: title } } : n)),
  }));
  const page: Page = {
    id: uniqueId(site, slugify(title)),
    title,
    slug: uniqueSlug(site, input.slug ?? title, parentId),
    parentId,
    status: "draft",
    template: template?.id ?? "blank",
    seo: {},
    isHome: false,
    showInNav: false,
    sections,
    overlays: [],
  };
  // Sub-pages sit right after their siblings so the list reads as a tree.
  const pages = [...site.pages];
  const lastSibling = parentId ? pages.reduce((last, p, i) => (p.id === parentId || p.parentId === parentId ? i : last), -1) : pages.length - 1;
  pages.splice(lastSibling + 1, 0, page);
  const next = { ...site, pages };
  return { site: input.showInNav === false ? next : setShowInNav(next, page.id, true), pageId: page.id };
}

export const renamePage = (site: Site, pageId: string, title: string): Site =>
  title.trim() ? { ...site, pages: site.pages.map((p) => (p.id === pageId ? { ...p, title: title.trim() } : p)) } : site;

/**
 * Change the last part of a page's URL. Sub-pages move with it, and every
 * old URL gets a redirect so links out in the world keep working.
 */
export function setSlug(site: Site, pageId: string, segment: string): Site {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page || page.isHome) return site;
  const slug = uniqueSlug(site, segment, page.parentId, pageId);
  if (slug === page.slug) return site;
  const moves: Redirect[] = [{ from: page.slug, to: slug }];
  const pages = site.pages.map((p) => {
    if (p.id === pageId) return { ...p, slug };
    if (p.parentId === pageId) {
      const childSlug = slug + p.slug.slice(page.slug.length);
      moves.push({ from: p.slug, to: childSlug });
      return { ...p, slug: childSlug };
    }
    return p;
  });
  return { ...site, pages, redirects: withRedirects(site, pages, moves) };
}

/** "Place it": move a page to the top level or under another page. Its URL follows. */
export function setParent(site: Site, pageId: string, parentId: string | null): Site {
  const page = site.pages.find((p) => p.id === pageId);
  const parent = parentId ? site.pages.find((p) => p.id === parentId) : null;
  if (!page || page.isHome || page.parentId === parentId) return site;
  if (parentId && (!parent || parent.parentId || parent.isHome || parent.id === pageId)) return site;
  if (parentId && site.pages.some((p) => p.parentId === pageId)) return site; // it has sub-pages itself: nesting stays one level deep
  const slug = uniqueSlug(site, page.slug.split("/").pop()!, parentId, pageId);
  const moved = { ...page, parentId, slug };
  const rest = site.pages.filter((p) => p.id !== pageId);
  const after = parentId ? rest.reduce((last, p, i) => (p.id === parentId || p.parentId === parentId ? i : last), -1) : rest.length - 1;
  rest.splice(after + 1, 0, moved);
  const withPage = { ...site, pages: rest, redirects: withRedirects(site, rest, [{ from: page.slug, to: slug }]) };
  // The top-level nav link goes when a page is nested, and comes back when it is promoted.
  const items = withPage.nav.items.filter((i) => !(i.type === "page" && i.target?.kind === "page" && i.target.pageId === pageId));
  const unlinked = { ...withPage, nav: { ...withPage.nav, items } };
  return page.showInNav && !parentId ? setShowInNav(unlinked, pageId, true) : unlinked;
}

export const setStatus = (site: Site, pageId: string, status: Page["status"]): Site => ({ ...site, pages: site.pages.map((p) => (p.id === pageId ? { ...p, status } : p)) });

export const setSeo = (site: Site, pageId: string, seo: Partial<Page["seo"]>): Site => ({
  ...site,
  pages: site.pages.map((p) => (p.id === pageId ? { ...p, seo: Object.fromEntries(Object.entries({ ...p.seo, ...seo }).filter(([, v]) => v !== undefined && v !== "")) } : p)),
});

/** Copy a page (not its sub-pages) as a hidden draft with a new URL. */
export function duplicatePage(site: Site, pageId: string): { site: Site; pageId: string } | null {
  const source = site.pages.find((p) => p.id === pageId);
  if (!source) return null;
  const parentId = source.isHome ? null : source.parentId;
  const title = `${source.title} copy`;
  const sections = instantiate(source.sections);
  const sectionIds = new Map(source.sections.map((s, i) => [s.id, sections[i]!.id]));
  const copy: Page = {
    ...structuredClone(source),
    id: uniqueId(site, `${source.id}-copy`),
    title,
    slug: uniqueSlug(site, `${source.isHome ? "home" : source.slug.split("/").pop()}-copy`, parentId),
    parentId,
    status: "draft",
    isHome: false,
    showInNav: false,
    sections,
    overlays: source.overlays.map((o) => ({
      ...structuredClone(o),
      id: newId("o"),
      node: { ...structuredClone(o.node), id: newId("n") },
      anchor: o.anchor === "viewport" ? "viewport" : { ...o.anchor, sectionId: sectionIds.get(o.anchor.sectionId) ?? o.anchor.sectionId },
    })),
  };
  const pages = [...site.pages];
  pages.splice(pages.findIndex((p) => p.id === pageId) + 1 + pages.filter((p) => p.parentId === pageId).length, 0, copy);
  return { site: { ...site, pages }, pageId: copy.id };
}

/**
 * Delete a page. Its sub-pages and every nav entry pointing at them go too,
 * and each removed URL redirects to the home page. The home page can't be deleted.
 */
export function deletePage(site: Site, pageId: string): Site {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page || page.isHome) return site;
  const gone = site.pages.filter((p) => p.id === pageId || p.parentId === pageId);
  const ids = new Set(gone.map((p) => p.id));
  const pages = site.pages.filter((p) => !ids.has(p.id));
  const items = mapNav(site.nav.items, (item) => (targetsPage(item, ids) ? null : item));
  return { ...site, pages, nav: { ...site.nav, items }, redirects: withRedirects(site, pages, gone.map((p) => ({ from: p.slug, to: "/" }))) };
}

/** Move a page up or down among its siblings in the pages list. */
export function reorderPage(site: Site, pageId: string, delta: -1 | 1): Site {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page) return site;
  const siblings = site.pages.filter((p) => p.parentId === page.parentId);
  const i = siblings.findIndex((p) => p.id === pageId);
  const other = siblings[i + delta];
  if (!other || (page.isHome || other.isHome)) return site;
  const swapped = [...siblings];
  swapped[i] = other;
  swapped[i + delta] = page;
  // Rebuild the flat list as a tree walk so sub-pages stay under their parent.
  const top = page.parentId ? site.pages.filter((p) => !p.parentId) : swapped;
  const pages = top.flatMap((p) => [p, ...(page.parentId === p.id ? swapped : site.pages.filter((c) => c.parentId === p.id))]);
  return { ...site, pages };
}

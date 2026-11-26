import type { RenderCtx } from "../../components/types";
import type { NavItem, Page, Section, Site } from "../../schema";

/** A nav item with everything looked up: label, href, current state, children. */
export type ResolvedItem = {
  id: string;
  type: NavItem["type"];
  label: string;
  ariaLabel?: string;
  href?: string;
  newTab: boolean;
  external: boolean;
  /** This item, or one of its children, is the page being viewed. */
  current: boolean;
  showOn: NavItem["showOn"];
  hover: NavItem["hover"];
  icon?: NavItem["icon"];
  badge?: { text: string; expires?: string };
  children: ResolvedItem[];
  panel?: Section[];
  variant?: "filled" | "outline";
  description?: string;
  code?: string;
  divider?: boolean;
};

/**
 * A page the nav links to only once it's published. The editor's frames follow the same rule (they
 * used to list draft pages too), so the nav looks while editing exactly as it will on the site.
 */
// Campaign pages are reached by link only, so they never show in the nav.
const live = (p: Page | undefined, _editing: boolean): p is Page => !!p && p.status === "published" && p.kind !== "campaign";

/** A badge with an expiry date disappears after that day (also enforced client-side). */
export function badgeFor(item: NavItem, today: string): ResolvedItem["badge"] {
  if (!item.badge) return undefined;
  if (item.badge.expires && item.badge.expires < today) return undefined;
  return item.badge;
}

export function subPages(site: Site, parentId: string, editing: boolean): Page[] {
  return site.pages.filter((p) => p.parentId === parentId && p.showInNav && live(p, editing));
}

function pageItem(page: Page, ctx: RenderCtx, id: string): ResolvedItem {
  return {
    id,
    type: "page",
    label: page.title,
    href: ctx.href({ kind: "page", pageId: page.id }),
    newTab: false,
    external: false,
    current: ctx.page?.id === page.id,
    showOn: "both",
    hover: "tint",
    children: [],
  };
}

export function resolveItem(item: NavItem, ctx: RenderCtx, today: string): ResolvedItem | null {
  const { site } = ctx;
  const target = item.target;
  const targetPage = target && (target.kind === "page" || target.kind === "section") ? site.pages.find((p) => p.id === target.pageId) : undefined;
  const href = target ? ctx.href(target) : undefined;
  const base: ResolvedItem = {
    id: item.id,
    type: item.type,
    label: item.label?.trim() || (ctx.lang ? targetPage?.translations?.[ctx.lang]?.title : undefined) || targetPage?.title || "",
    ariaLabel: item.ariaLabel?.trim() || undefined,
    description: item.description?.trim() || undefined,
    href,
    newTab: !!item.newTab,
    external: !!href && /^https?:/i.test(href),
    current: false,
    showOn: item.showOn,
    hover: item.hover,
    icon: item.icon && item.icon.position !== "none" ? item.icon : undefined,
    badge: badgeFor(item, today),
    children: [],
    panel: item.panel,
    variant: item.variant,
    code: item.code,
    divider: item.divider,
  };

  switch (item.type) {
    case "page": {
      if (!live(targetPage, ctx.editing) || !targetPage.showInNav) return null;
      // A page with visible sub-pages gets a caret and a dropdown automatically.
      base.children = subPages(site, targetPage.id, ctx.editing).map((p) => pageItem(p, ctx, `${item.id}-${p.id}`));
      base.current = ctx.page?.id === targetPage.id || base.children.some((c) => c.current);
      return base;
    }
    case "section":
      if (!live(targetPage, ctx.editing)) return null;
      return base;
    case "dropdown": {
      if (item.source === "manual") {
        base.children = (item.children ?? []).map((c) => resolveItem(c, ctx, today)).filter((c): c is ResolvedItem => !!c);
      } else if (targetPage) {
        base.children = subPages(site, targetPage.id, ctx.editing).map((p) => pageItem(p, ctx, `${item.id}-${p.id}`));
      }
      base.current = base.children.some((c) => c.current) || (!!targetPage && ctx.page?.id === targetPage.id);
      return base.children.length ? base : null;
    }
    case "external":
    case "button":
      return base.href ? base : null;
    default:
      return base;
  }
}

export function resolveNav(ctx: RenderCtx, today = new Date().toISOString().slice(0, 10)): ResolvedItem[] {
  return ctx.site.nav.items.map((i) => resolveItem(i, ctx, today)).filter((i): i is ResolvedItem => !!i);
}

/**
 * Whether these (already resolved) items give a menu anything to go to: a link to a
 * published page, a section, an external site, or a dropdown or mega menu holding one.
 * Social icons, labels, embeds and search alone don't count. Items for draft pages
 * are dropped by resolveItem, so they never count either.
 */
export function hasMenuLinks(items: ResolvedItem[]): boolean {
  return items.some((i) => {
    switch (i.type) {
      case "page":
      case "section":
      case "external":
      case "button":
        return !!i.href;
      case "dropdown":
        return hasMenuLinks(i.children);
      case "mega":
        return !!i.panel?.length;
      default:
        return false;
    }
  });
}

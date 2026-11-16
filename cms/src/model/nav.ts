import { newId, type NavConfig, type NavItem, type Section, type Site } from "../schema";
import { createNode, createSection } from "./page-ops";

/** Editing the navigation (SPEC §6): the ten item types, their settings, order and nesting. */

export const NAV_TYPE_LABELS: Record<NavItem["type"], string> = {
  page: "Page link",
  section: "Section link",
  external: "External link / email",
  dropdown: "Dropdown",
  mega: "Mega menu",
  button: "Button",
  social: "Social icons",
  search: "Search",
  embed: "Embed / code",
  label: "Label & divider",
};

export function findNavItem(items: NavItem[], id: string): NavItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = item.children ? findNavItem(item.children, id) : undefined;
    if (child) return child;
  }
  return undefined;
}

const mapItems = (items: NavItem[], fn: (list: NavItem[]) => NavItem[]): NavItem[] => fn(items).map((item) => (item.children ? { ...item, children: mapItems(item.children, fn) } : item));

const setNav = (site: Site, fn: (nav: NavConfig) => NavConfig): Site => ({ ...site, nav: fn(site.nav) });

export function updateNavItem(site: Site, id: string, patch: Partial<NavItem>): Site {
  return setNav(site, (nav) => ({
    ...nav,
    items: mapItems(nav.items, (list) =>
      list.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch } as Record<string, unknown>;
        for (const [k, v] of Object.entries(next)) if (v === undefined || v === "") delete next[k];
        return next as unknown as NavItem;
      }),
    ),
  }));
}

export function removeNavItem(site: Site, id: string): Site {
  return setNav(site, (nav) => ({ ...nav, items: mapItems(nav.items, (list) => list.filter((item) => item.id !== id)) }));
}

/** Move an item one place earlier or later among its siblings. */
export function moveNavItem(site: Site, id: string, delta: -1 | 1): Site {
  return setNav(site, (nav) => ({
    ...nav,
    items: mapItems(nav.items, (list) => {
      const i = list.findIndex((item) => item.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    }),
  }));
}

/** A starter panel for a mega menu: columns of links on desktop, stacked on phones. */
export function megaStarter(site: Site): Section[] {
  const pages = site.pages.filter((p) => !p.isHome && !p.parentId && p.status === "published").slice(0, 3);
  return [
    createSection("grid", {
      name: "Menu panel",
      layout: { base: { columns: 1, gap: 16, padding: "20px" }, desktop: { columns: 4, gap: 24, padding: "28px" } },
      children: [
        createNode("Text", { content: { text: "Bodies of work", styleId: "label", tag: "p" }, style: { color: "token:muted" } }),
        ...pages.map((p) => createNode("Button", { content: { label: p.title, target: { kind: "page", pageId: p.id }, variant: "text" } })),
      ],
    }),
  ];
}

export function newNavItem(site: Site, type: NavItem["type"]): NavItem {
  const base: NavItem = { id: newId("nav"), type, showOn: "both", hover: "tint" };
  const firstPage = site.pages.find((p) => !p.isHome && !p.parentId) ?? site.pages[0]!;
  const home = site.pages.find((p) => p.isHome) ?? site.pages[0]!;
  switch (type) {
    case "page":
      return { ...base, target: { kind: "page", pageId: firstPage.id } };
    case "section":
      return { ...base, label: home.sections[0]?.name ?? "Section", target: { kind: "section", pageId: home.id, sectionId: home.sections[0]?.id ?? "" } };
    case "external":
      return { ...base, label: "Link", target: { kind: "url", url: "https://" }, newTab: true, icon: { name: "arrow", position: "right" } };
    case "dropdown":
      return { ...base, label: "More", source: "manual", children: [] };
    case "mega":
      return { ...base, label: "Menu", panel: megaStarter(site) };
    case "button":
      return { ...base, label: "Say howdy", target: { kind: "url", url: "/" }, variant: "filled" };
    case "embed":
      return { ...base, label: "Embed", code: '<div style="font:600 12px Inter,sans-serif;color:#F3EFE6;padding:14px 12px;white-space:nowrap">NOW SHOWING · DUST AND NEON</div>' };
    case "label":
      return { ...base, label: "Label" };
    default:
      return base; // social, search
  }
}

/** Add an item to the bar, or inside a manual dropdown when parentId is given. */
export function addNavItem(site: Site, type: NavItem["type"], parentId?: string): { site: Site; itemId: string } {
  const item = newNavItem(site, type);
  const next = setNav(site, (nav) => ({
    ...nav,
    items: parentId ? mapItems(nav.items, (list) => list.map((i) => (i.id === parentId ? { ...i, children: [...(i.children ?? []), item] } : i))) : [...nav.items, item],
  }));
  return { site: next, itemId: item.id };
}

export const setNavBehaviour = (site: Site, patch: Partial<Omit<NavConfig, "items">>): Site => setNav(site, (nav) => ({ ...nav, ...patch }));

/** Item types that make sense inside a dropdown menu. */
export const MENU_CHILD_TYPES: NavItem["type"][] = ["page", "section", "external", "label", "social", "embed"];

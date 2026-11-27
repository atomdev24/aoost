import type { NavConfig, NavItem, Page } from "../schema";
import { AEROBOTICS_TEMPLATES } from "../editor/templates/aerobotics-templates";
import { page } from "../seed/site";

/**
 * The demo's Aerobotics pages, one per page type on aerobotics.com plus an event page, each made
 * from its Aerobotics template (Templates panel) so they look the same as a page started there.
 * They replace the old portfolio sample pages (Work, Journal, About, Contact) in the demo, and the
 * Aerobotics nav links to them instead of to aerobotics.com where a page exists.
 * Built on call (fresh block ids), never at module scope: a Worker can't make random ids at start.
 */
export const DEMO_AERO_PAGES = [
  { id: "true-fruit-size", title: "TrueFruit Size", slug: "/true-fruit-size", template: "aero-product" },
  { id: "pricing", title: "Pricing", slug: "/pricing", template: "aero-pricing" },
  { id: "about-us", title: "About us", slug: "/about-us", template: "aero-about" },
  { id: "careers", title: "Careers", slug: "/careers", template: "aero-careers" },
  { id: "contact-us", title: "Contact us", slug: "/contact-us", template: "aero-contact" },
  { id: "request-a-demo", title: "Request a demo", slug: "/request-a-demo", template: "aero-demo" },
  { id: "drone-partners", title: "Drone partners", slug: "/drone-partners", template: "aero-drone" },
  { id: "interpoma-2026", title: "Interpoma 2026", slug: "/events/interpoma-2026", template: "aero-campaign", kind: "campaign" as const },
];

/** The old portfolio sample pages these replace. */
export const OLD_DEMO_PAGES = ["work", "journal", "about", "contact"];

export function aeroboticsDemoPages(): Page[] {
  return DEMO_AERO_PAGES.map((p) => {
    const t = AEROBOTICS_TEMPLATES.find((x) => x.id === p.template);
    if (!t) throw new Error(`No Aerobotics template ${p.template}`);
    // Menu links to a page show only while its eye (showInNav) is on; campaign pages stay out of menus.
    const campaign = "kind" in p;
    return page({ id: p.id, title: p.title, slug: p.slug, showInNav: !campaign, template: "blank", sections: t.sections(), ...(campaign ? { kind: p.kind } : {}) });
  });
}

/** aerobotics.com addresses that have a page of their own in the demo. */
const LOCAL: Record<string, string> = {
  "/true-fruit-size": "true-fruit-size",
  "/pricing": "pricing",
  "/about-us": "about-us",
  "/contact-us": "contact-us",
  "/request-a-demo": "request-a-demo",
  "/drone-partners": "drone-partners",
  "/careers": "careers",
};

/** The nav with links to aerobotics.com pages that exist in the demo pointed at those pages. */
export function linkNavToDemoPages(nav: NavConfig, pageIds: string[] = DEMO_AERO_PAGES.map((p) => p.id)): NavConfig {
  const fix = (item: NavItem): NavItem => {
    const url = item.target?.kind === "url" ? item.target.url : "";
    const m = /^https:\/\/(?:www\.)?aerobotics\.com(\/[^?#]*)$/.exec(url);
    const pageId = m ? LOCAL[m[1]!.replace(/\/$/, "")] : undefined;
    const children = item.children?.map(fix);
    if (!pageId || !pageIds.includes(pageId)) return children ? { ...item, children } : item;
    const { newTab: _drop, ...rest } = item;
    return { ...rest, type: item.type === "external" ? "page" : item.type, target: { kind: "page", pageId }, ...(children ? { children } : {}) };
  };
  return { ...nav, items: nav.items.map(fix) };
}

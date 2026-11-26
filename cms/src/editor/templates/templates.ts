import { applyAeroboticsNav } from "../../model/nav-presets";
import { createPage, deletePage } from "../../model/pages";
import { createVariant, ownerPage, variantsOf } from "../../model/variants";
import type { Page, Site } from "../../schema";
import { currentPage, getState, setPage, update } from "../store";
import type { SiteTemplate } from "./site-templates";

/**
 * Templates on a page: start a page from one, or try several on the same page
 * (each is a variant of it), and review them side by side (Review, then Pick:
 * EDITOR-VARIANTS.md). Picking one puts it on the page and keeps the others as
 * earlier versions; the staging link is the share link (in the demo, until the
 * nightly reset).
 */

const withTemplate = (page: Page, t: SiteTemplate): Page => {
  const next: Page = { ...page, sections: t.sections(), overlays: [], variantIds: {} };
  if (t.hideNav) next.hideNav = true;
  else delete next.hideNav;
  return next;
};

/** The template's nav on the site, unless the site already uses it (keeps any edits made to it). */
const withNav = (site: Site, t: SiteTemplate): Site => (t.nav === "aerobotics" && site.nav.logoImage !== "/art/tpl_aero_logo.svg" ? applyAeroboticsNav(site) : site);

/** A new page made from the template; opens it. */
export function newPageFrom(t: SiteTemplate) {
  let made = "";
  update((site) => {
    const { site: next, pageId } = createPage(site, { name: t.name.split(",")[0]!, showInNav: false });
    made = pageId;
    return withNav({ ...next, pages: next.pages.map((p) => (p.id === pageId ? { ...withTemplate(p, t), variantIds: undefined } : p)) }, t);
  }, `New page from ${t.name}`);
  if (made) setPage(made);
}

/** The template as another design for the page on screen (a variant of it); opens it. */
export function tryOnPage(t: SiteTemplate) {
  const page = ownerPage(getState().site, currentPage(getState()));
  let made = "";
  update((site) => {
    const v = createVariant(site, page.id, t.name);
    if (!v) return site;
    made = v.pageId;
    return withNav({ ...v.site, pages: v.site.pages.map((p) => (p.id === v.pageId ? withTemplate(p, t) : p)) }, t);
  }, `Try ${t.name}`);
  if (made) setPage(made);
}

export const designsFor = (site: Site, page: Page) => variantsOf(site, ownerPage(site, page).id);

export function removeDesign(variantId: string) {
  const s = getState();
  const v = s.site.pages.find((p) => p.id === variantId);
  if (!v?.variantOf) return;
  if (currentPage(s).id === variantId) setPage(v.variantOf);
  update((site) => deletePage(site, variantId), `Remove ${v.variantName ?? "design"}`);
}


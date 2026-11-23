import { createPage, deletePage } from "../../model/pages";
import { createVariant, electVariant, ownerPage, variantsOf } from "../../model/variants";
import type { Page, Site } from "../../schema";
import { currentPage, flush, getState, setPage, update } from "../store";
import { getStaging, sendToStaging } from "../workspace/staging";
import type { SiteTemplate } from "./site-templates";

/**
 * Templates on a page: start a page from one, or try several on the same page
 * (each is a variant of it), lay them side by side on the board, and use one.
 * Using one puts it on the page, removes the others and sends the draft to
 * staging, whose link is the share link (in the demo, until the nightly reset).
 */

const withTemplate = (page: Page, t: SiteTemplate): Page => {
  const next: Page = { ...page, sections: t.sections(), overlays: [], variantIds: {} };
  if (t.hideNav) next.hideNav = true;
  else delete next.hideNav;
  return next;
};

/** A new page made from the template; opens it. */
export function newPageFrom(t: SiteTemplate) {
  let made = "";
  update((site) => {
    const { site: next, pageId } = createPage(site, { name: t.name.split(",")[0]!, showInNav: false });
    made = pageId;
    return { ...next, pages: next.pages.map((p) => (p.id === pageId ? { ...withTemplate(p, t), variantIds: undefined } : p)) };
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
    return { ...v.site, pages: v.site.pages.map((p) => (p.id === v.pageId ? withTemplate(p, t) : p)) };
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

/**
 * Use one design for the page (a variant id), or keep the page as it is (null):
 * the others are removed and the draft goes to staging. Returns the share link.
 */
export async function chooseDesign(pageId: string, variantId: string | null): Promise<string | null> {
  const s = getState();
  const page = s.site.pages.find((p) => p.id === pageId);
  if (!page) return null;
  const chosen = variantId ? s.site.pages.find((p) => p.id === variantId) : null;
  update((site) => {
    let next = variantId ? (electVariant(site, variantId) ?? site) : site;
    for (const v of variantsOf(next, pageId)) next = deletePage(next, v.id);
    // A page made to show a design is meant to be seen.
    if (variantId) next = { ...next, pages: next.pages.map((p) => (p.id === pageId && p.status === "draft" ? { ...p, status: "unlisted" } : p)) };
    return next;
  }, chosen ? `Use ${chosen.variantName ?? "design"}` : `Keep ${page.title}`);
  setPage(pageId);
  await flush();
  const ok = await sendToStaging(`${page.title}: ${chosen?.variantName ?? "as it was"}`);
  const info = getStaging().info;
  if (!ok || !info) return null;
  const path = page.isHome ? "" : page.slug.replace(/^\//, "") + "/";
  return info.url.replace(/\/?$/, "/") + path;
}

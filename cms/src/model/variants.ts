import type { Page, Site } from "../schema";
import { duplicatePage, uniqueSlug } from "./pages";

/**
 * Variants: a copy of a page to try ideas on without touching the page itself.
 * A variant is a page with `variantOf` set. It always stays a draft, so it is
 * never built into the site; electing it moves its content onto the page it
 * came from (keeping that page's id, address, title and place in the nav) and
 * removes the variant. Electing changes the draft; staging and Push to
 * production then take it live.
 */
export const isVariant = (p: Page) => p.variantOf !== undefined;
export const variantsOf = (site: Site, pageId: string) => site.pages.filter((p) => p.variantOf === pageId);
/** The page a variant belongs to, or the page itself. */
export const ownerPage = (site: Site, page: Page): Page => (page.variantOf ? (site.pages.find((p) => p.id === page.variantOf) ?? page) : page);

/** Walk two copies of the same content side by side and pair their ids (copy id → source id). */
function pairIds(source: unknown, copy: unknown, out: Record<string, string>) {
  if (Array.isArray(source) && Array.isArray(copy)) {
    copy.forEach((c, i) => pairIds(source[i], c, out));
    return;
  }
  if (!source || !copy || typeof source !== "object" || typeof copy !== "object") return;
  const a = source as Record<string, unknown>;
  const b = copy as Record<string, unknown>;
  if (typeof a.id === "string" && typeof b.id === "string" && a.id !== b.id) out[b.id] = a.id;
  for (const k of Object.keys(b)) if (k !== "id") pairIds(a[k], b[k], out);
}

/** Replace every string that is exactly one of the map's keys (block ids, and section ids in overlay anchors). */
function remap<T>(value: T, map: Record<string, string>): T {
  if (typeof value === "string") return (Object.hasOwn(map, value) ? map[value] : value) as T;
  if (Array.isArray(value)) return value.map((v) => remap(v, map)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v, map)])) as T;
  return value;
}

function nextName(site: Site, pageId: string): string {
  const taken = new Set(variantsOf(site, pageId).map((v) => v.variantName));
  for (let n = 1; ; n++) if (!taken.has(`Variant ${n}`)) return `Variant ${n}`;
}

/** Make a variant of a page (of the page a variant belongs to, if given a variant). */
export function createVariant(site: Site, pageId: string, name?: string): { site: Site; pageId: string } | null {
  const from = site.pages.find((p) => p.id === pageId);
  if (!from) return null;
  const target = ownerPage(site, from);
  const copy = duplicatePage(site, from.id);
  if (!copy) return null;
  const variantName = name?.trim().slice(0, 60) || nextName(site, target.id);
  const segment = `${target.isHome ? "home" : target.slug.split("/").pop()}-${variantName}`;
  const pages = copy.site.pages.map((p): Page => {
    if (p.id !== copy.pageId) return p;
    const parentId = target.isHome ? null : target.parentId;
    // Which of the page's blocks each copied block came from (through the source variant, when copying a variant).
    const pairs: Record<string, string> = {};
    pairIds({ sections: from.sections, overlays: from.overlays }, { sections: p.sections, overlays: p.overlays }, pairs);
    const variantIds: Record<string, string> = {};
    for (const [copyId, fromId] of Object.entries(pairs)) {
      const original = from.variantOf ? from.variantIds?.[fromId] : fromId;
      if (original) variantIds[copyId] = original;
    }
    return { ...p, title: target.title, slug: uniqueSlug(copy.site, segment, parentId, p.id), parentId, status: "draft", isHome: false, showInNav: false, variantOf: target.id, variantName, variantIds };
  });
  // Keep a variant next to its page: after the page, its sub-pages and its other variants.
  const variant = pages.find((p) => p.id === copy.pageId)!;
  const rest = pages.filter((p) => p.id !== copy.pageId);
  let at = rest.findIndex((p) => p.id === target.id) + 1;
  while (at < rest.length && (rest[at]!.parentId === target.id || rest[at]!.variantOf === target.id)) at++;
  rest.splice(at, 0, variant);
  return { site: { ...site, pages: rest }, pageId: copy.pageId };
}

export const renameVariant = (site: Site, variantId: string, name: string): Site => ({
  ...site,
  pages: site.pages.map((p) => (p.id === variantId && p.variantOf && name.trim() ? { ...p, variantName: name.trim().slice(0, 60) } : p)),
});

/** Put a variant's content on its page and remove the variant. */
export function electVariant(site: Site, variantId: string): Site | null {
  const v = site.pages.find((p) => p.id === variantId);
  if (!v?.variantOf) return null;
  const target = site.pages.find((p) => p.id === v.variantOf);
  if (!target) return null;
  // Blocks copied from the page get their ids back, so links to its sections keep working and only real edits count as changes.
  // A page block the variant deleted frees its id; another variant's block can't hold it (each copy has fresh ids).
  const map = v.variantIds ?? {};
  const elected: Page = { ...target, sections: remap(v.sections, map), overlays: remap(v.overlays, map), template: v.template, seo: v.seo, hideNav: v.hideNav };
  if (elected.hideNav === undefined) delete elected.hideNav;
  return { ...site, pages: site.pages.filter((p) => p.id !== variantId).map((p) => (p.id === target.id ? elected : p)) };
}

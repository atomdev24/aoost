import type { Page, Site } from "../schema";

export type PageKind = NonNullable<Page["kind"]>;
export const kindOf = (p: Pick<Page, "kind">): PageKind => p.kind ?? "page";
export const isCampaign = (p: Pick<Page, "kind">) => kindOf(p) === "campaign";
export const isPost = (p: Pick<Page, "kind">) => kindOf(p) === "post";

/** A campaign page past its unpublish day (the day itself still shows). */
export function isExpired(p: Pick<Page, "kind" | "unpublishAt">, today = new Date().toISOString().slice(0, 10)): boolean {
  return isCampaign(p) && !!p.unpublishAt && today > p.unpublishAt;
}

/** Blog posts that are live, newest first. Optionally only those under one parent page. */
export function livePosts(site: Site, parentId?: string | null): Page[] {
  return site.pages
    .filter((p) => isPost(p) && p.status !== "draft" && !p.variantOf && (parentId === undefined || p.parentId === parentId))
    .sort((a, b) => (b.post?.date ?? "").localeCompare(a.post?.date ?? ""));
}

/** Slug → unpublish day, for every campaign page that has one (the Worker turns them away after it). */
export function expiries(site: Site): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of site.pages) if (isCampaign(p) && p.unpublishAt && p.status !== "draft" && !p.variantOf) out[p.slug] = p.unpublishAt;
  return out;
}

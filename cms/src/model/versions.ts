import { validateSite, type Site } from "../schema";

/**
 * The draft after restoring an older version: that version's content, plus the
 * variants in the draft now (they were never published, so the old version
 * doesn't have them) wherever their page still exists. A variant that no longer
 * fits (its page is gone, or its address is taken) is left out.
 */
export function restoreVersion(current: Site, old: Site): { site: Site; droppedVariants: string[] } {
  const ids = new Set(old.pages.map((p) => p.id));
  const slugs = new Set(old.pages.map((p) => p.slug));
  const pages = [...old.pages];
  const dropped: string[] = [];
  for (const v of current.pages.filter((p) => p.variantOf)) {
    if (!ids.has(v.variantOf!) || ids.has(v.id) || slugs.has(v.slug) || (v.parentId && !ids.has(v.parentId))) {
      dropped.push(v.variantName ?? v.id);
      continue;
    }
    const at = pages.findIndex((p) => p.id === v.variantOf);
    pages.splice(at + 1, 0, v);
    ids.add(v.id);
    slugs.add(v.slug);
  }
  const withVariants = { ...old, pages };
  const check = validateSite(withVariants);
  if (check.ok) return { site: check.site, droppedVariants: dropped };
  return { site: old, droppedVariants: current.pages.filter((p) => p.variantOf).map((p) => p.variantName ?? p.id) };
}

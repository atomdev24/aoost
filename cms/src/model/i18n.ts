import type { Node, Page, Site } from "../schema";

export type Translation = NonNullable<Page["translations"]>[string];

export const LANGUAGE_NAMES: Record<string, string> = { en: "English", es: "Spanish", pt: "Portuguese", fr: "French", de: "German", it: "Italian", ar: "Arabic", nl: "Dutch", af: "Afrikaans" };
export const languageName = (code: string) => LANGUAGE_NAMES[code] ?? code.toUpperCase();

/** The site's languages, main first. */
export const siteLanguages = (site: Site): string[] => (site.settings.languages?.length ? site.settings.languages : ["en"]);
export const mainLanguage = (site: Site): string => siteLanguages(site)[0]!;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const textLength = (n: Node) => (typeof n.content.text === "string" ? n.content.text.length : 0);

/** The address of a page in a language: its own slug, or /es + the page's slug (/es for home). */
export function translatedSlug(page: Pick<Page, "slug" | "translations">, lang: string): string {
  return page.translations?.[lang]?.slug ?? `/${lang}${page.slug === "/" ? "" : page.slug}`;
}

/** Can this page have linked translations? Permanent pages and posts can; campaign copies are made by hand. */
export const translatable = (page: Pick<Page, "kind" | "lang" | "variantOf">) => page.kind !== "campaign" && !page.lang && !page.variantOf;

/**
 * Shrink factor for a translated text that runs longer than the original: none up to 15% longer,
 * then the square root of the ratio, never below 0.82 (UI spec, Nov 2026: "auto-fit first").
 */
export function fitFor(original: number, translated: number): number | undefined {
  if (!original || translated <= original * 1.15) return undefined;
  return Math.max(0.82, Math.round(Math.sqrt(original / translated) * 100) / 100);
}

function translateNode(node: Node, t: Translation): Node {
  const content = t.content[node.id];
  const style = t.style?.[node.id] as Node["style"] | undefined;
  if (!content && !style) return node;
  const next: Node = { ...node, content: content ? { ...node.content, ...content } : node.content, ...(style ? { style } : {}) };
  const fit = fitFor(textLength(node), textLength(next));
  return fit ? { ...next, fit } : next;
}

/** The page as it reads in a language: translated values over the shared structure. */
export function applyTranslation(page: Page, lang: string): Page {
  const t = page.translations?.[lang];
  if (!t) return page;
  return {
    ...page,
    lang,
    title: t.title || page.title,
    slug: translatedSlug(page, lang),
    seo: { ...page.seo, ...(t.seo ?? {}) },
    sections: page.sections.map((s) => ({ ...s, children: s.children.map((n) => translateNode(n, t)) })),
    overlays: page.overlays.map((o) => ({ ...o, node: translateNode(o.node, t) })),
  };
}

/**
 * Fold an edit made while viewing a translation back into the page. Structure (blocks added,
 * removed, moved; sections) is shared, so it goes to the page itself. A block's values that now
 * differ from the main language are kept as that language's values; a style that differs is that
 * language's layout nudge. New blocks join the main language as they are.
 */
export function mergeTranslatedEdit(base: Page, edited: Page, lang: string): Page {
  const t: Translation = base.translations?.[lang] ?? { status: "draft", content: {} };
  const baseNodes = new Map<string, Node>();
  for (const s of base.sections) for (const n of s.children) baseNodes.set(n.id, n);
  const content: Translation["content"] = {};
  const style: Record<string, unknown> = {};
  const sections = edited.sections.map((s) => ({
    ...s,
    children: s.children.map((n) => {
      const { fit: _fit, ...plain } = n;
      const orig = baseNodes.get(n.id);
      if (!orig) return plain; // a new block: shared as it is
      const diff: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(plain.content)) if (!same(v, orig.content[k])) diff[k] = v;
      if (Object.keys(diff).length) content[n.id] = diff;
      if (!same(plain.style, orig.style)) style[n.id] = plain.style;
      return { ...plain, content: orig.content, style: orig.style };
    }),
  }));
  const next: Translation = { ...t, content, ...(Object.keys(style).length ? { style } : { style: undefined }) };
  if (!next.style) delete next.style;
  return { ...base, sections, translations: { ...(base.translations ?? {}), [lang]: next } };
}

/** Start a linked translation of a page (a draft until it's switched live). */
export function addTranslation(page: Page, lang: string): Page {
  if (page.translations?.[lang]) return page;
  return { ...page, translations: { ...(page.translations ?? {}), [lang]: { status: "draft", content: {} } } };
}

/** Blocks with words in them that have no translated value yet (marked in the editor). */
export function untranslatedIds(page: Page, lang: string): string[] {
  const t = page.translations?.[lang];
  if (!t) return [];
  const ids: string[] = [];
  for (const s of page.sections)
    for (const n of s.children) {
      const words = Object.entries(n.content).some(([k, v]) => typeof v === "string" && v.trim() && /text|title|label|heading|line|caption|body|alt|byline|excerpt|name|description/i.test(k));
      if (words && !t.content[n.id]) ids.push(n.id);
    }
  return ids;
}

/** A hand-made copy of a campaign page in another language, beside the original. */
export function languageCopy(site: Site, pageId: string, lang: string): { site: Site; pageId: string } | null {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page) return null;
  const used = new Set(site.pages.map((p) => p.id));
  const slugs = new Set(site.pages.map((p) => p.slug));
  let id = `${page.id}-${lang}`;
  for (let i = 2; used.has(id); i++) id = `${page.id}-${lang}-${i}`;
  let slug = `${page.slug === "/" ? "" : page.slug}-${lang}`;
  for (let i = 2; slugs.has(slug); i++) slug = `${page.slug}-${lang}-${i}`;
  const copy: Page = { ...structuredClone(page), id, slug, title: `${page.title} (${lang.toUpperCase()})`, lang, status: "draft", isHome: false, showInNav: false };
  delete copy.translations;
  const pages = [...site.pages];
  pages.splice(pages.indexOf(page) + 1, 0, copy);
  return { site: { ...site, pages }, pageId: id };
}

/**
 * The page at an address, in whichever language the address is for. `live` leaves out drafts
 * (pages and translations), for the public site and staging.
 */
export function pageAt(site: Site, slug: string, live: boolean): Page | undefined {
  // Variants are drafts: never live, but the draft preview shows them (Compare, All designs, Preview).
  const plain = site.pages.find((p) => p.slug === slug && (live ? p.status !== "draft" && p.variantOf === undefined : true));
  if (plain) return plain;
  for (const p of site.pages) {
    if (!p.translations || p.variantOf || (live && p.status === "draft")) continue;
    for (const [lang, t] of Object.entries(p.translations)) if (translatedSlug(p, lang) === slug && (!live || t.status === "published")) return applyTranslation(p, lang);
  }
  return undefined;
}

/** Every language a page reads in, with its address (for hreflang links and the language switch). */
export function pageVersions(site: Site, pageId: string, live: boolean): { lang: string; slug: string }[] {
  const p = site.pages.find((x) => x.id === pageId);
  if (!p || !translatable(p)) return [];
  const out = [{ lang: mainLanguage(site), slug: p.slug }];
  for (const [lang, t] of Object.entries(p.translations ?? {})) if (!live || t.status === "published") out.push({ lang, slug: translatedSlug(p, lang) });
  return out.length > 1 ? out : [];
}

/** Sections without the drawn-only text-fit factor, for comparing what the canvas holds. */
export const withoutFit = <S extends { children: Node[] }>(sections: S[]): S[] => sections.map((s) => ({ ...s, children: s.children.map(({ fit: _fit, ...n }) => n as Node) }));

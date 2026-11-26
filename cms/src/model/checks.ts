import type { Node, Page, Site } from "../schema";
import { untranslatedIds } from "./i18n";

/**
 * Ready-to-publish checks: what would embarrass the team once it's live, in plain words, each
 * pointing at the page and block to fix. Nothing here stops a publish; "fix" items are the ones
 * worth doing first. Research item 2 (EDITOR-CHECKS.md).
 */
export type CheckKind = "alt" | "empty" | "seo" | "link" | "translate" | "campaign";
export type Check = { id: string; kind: CheckKind; level: "fix" | "warn"; text: string; pageId: string; nodeId?: string; lang?: string };

const allNodes = (page: Page): Node[] => [...page.sections.flatMap((s) => s.children), ...page.overlays.map((o) => o.node)];

/** Addresses on this site that a link can point at ("/", "/work", "/es/work"…). */
function addresses(site: Site): Set<string> {
  const out = new Set<string>(["/"]);
  const langs = site.settings.languages ?? [];
  for (const p of site.pages) {
    out.add(p.slug);
    for (const l of langs.slice(1)) {
      const t = p.translations?.[l] as { slug?: string } | undefined;
      out.add(`/${l}${t?.slug ?? p.slug}`.replace(/\/$/, "") || "/");
    }
  }
  return out;
}

/** Links inside a block that point at this site: buttons' URLs and [text](/path) in words. */
function internalLinks(n: Node): string[] {
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (typeof v === "string") for (const m of v.matchAll(/\]\((\/[^)\s#?]*)/g)) out.push(m[1]!);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.kind === "url" && typeof o.url === "string" && /^\/(?!\/)/.test(o.url) && !/^\/(media|demo-art|assets|art)\//.test(o.url)) out.push(o.url.split(/[?#]/)[0]!);
      else Object.values(o).forEach(visit);
    }
  };
  visit(n.content);
  return out;
}

const label = (n: Node) => n.name || n.type;

export function publishChecks(site: Site, opts: { pageIds?: string[] } = {}): Check[] {
  const out: Check[] = [];
  const known = addresses(site);
  const langs = (site.settings.languages ?? []).slice(1);
  for (const page of site.pages) {
    if (opts.pageIds && !opts.pageIds.includes(page.id)) continue;
    // Only what goes live: not draft pages or variants.
    if (page.status === "draft" || (page as { variantOf?: string }).variantOf) continue;
    if (!page.seo.description?.trim() && page.kind !== "campaign")
      out.push({ id: `seo:${page.id}`, kind: "seo", level: "warn", text: "No search description (what Google shows under the title)", pageId: page.id });
    if (page.kind === "campaign" && !page.unpublishAt) out.push({ id: `campaign:${page.id}`, kind: "campaign", level: "warn", text: "Campaign page with no end date", pageId: page.id });
    for (const n of allNodes(page)) {
      const c = n.content as Record<string, unknown>;
      if (n.type === "Image" && c.src && !String(c.alt ?? "").trim())
        out.push({ id: `alt:${n.id}`, kind: "alt", level: "fix", text: "Picture without a description (screen readers and search read it)", pageId: page.id, nodeId: n.id });
      if ((n.type === "Image" && !c.src) || (n.type === "Video" && !(c.source === "link" ? c.url : c.src)))
        out.push({ id: `empty:${n.id}`, kind: "empty", level: "fix", text: `Empty ${n.type === "Video" ? "video" : "picture"}: it shows nothing on the site`, pageId: page.id, nodeId: n.id });
      for (const href of internalLinks(n)) {
        const path = href.replace(/\/$/, "") || "/";
        if (!known.has(path)) out.push({ id: `link:${n.id}:${href}`, kind: "link", level: "fix", text: `${label(n)} links to ${href}, which isn't a page`, pageId: page.id, nodeId: n.id });
      }
    }
    for (const lang of langs) {
      const t = page.translations?.[lang];
      if (!t || (t as { status?: string }).status === "draft") continue;
      const missing = untranslatedIds(page, lang);
      if (missing.length)
        out.push({ id: `translate:${page.id}:${lang}`, kind: "translate", level: "fix", text: `${lang.toUpperCase()}: ${missing.length} ${missing.length === 1 ? "block" : "blocks"} not translated yet`, pageId: page.id, nodeId: missing[0], lang });
    }
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "fix" ? -1 : 1));
}

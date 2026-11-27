import { RichColor, RichDoc, type RichBlock, type RichInline, type RichList, type RichMark, type RichParagraph } from "../schema/rich";

/**
 * Rich text next to plain text. A text block keeps `text` (the words, with **bold**, *italic*,
 * [links](url) and line breaks) and may add `rich` (the same words with colour, underline, lists
 * and paragraphs). The rich version is drawn only while it still says what `text` says, so
 * anything that changes just the words (Claude, a translation, a template) simply wins and the
 * block falls back to plain drawing. Nothing ever has to keep the two in step by hand.
 */

const INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)|\n/g;

/** The words as rich text: one paragraph, its line breaks and its **bold**, *italic* and links. */
export function textToDoc(text: string): RichDoc {
  const out: RichInline[] = [];
  const push = (t: string, marks?: RichMark[]) => t && out.push(marks ? { type: "text", text: t, marks } : { type: "text", text: t });
  let last = 0;
  INLINE.lastIndex = 0;
  for (let m = INLINE.exec(text); m; m = INLINE.exec(text)) {
    push(text.slice(last, m.index));
    if (m[1] !== undefined) push(m[1], [{ type: "bold" }]);
    else if (m[2] !== undefined) push(m[2], [{ type: "italic" }]);
    else if (m[3] !== undefined) push(m[3], [{ type: "link", attrs: { href: m[4]! } }]);
    else out.push({ type: "hardBreak" });
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return { type: "doc", content: [out.length ? { type: "paragraph", content: out } : { type: "paragraph" }] };
}

function inlineText(content: RichInline[] | undefined): string {
  return (content ?? [])
    .map((n) => {
      if (n.type === "hardBreak") return "\n";
      const has = (t: RichMark["type"]) => n.marks?.some((m) => m.type === t);
      let s = n.text;
      if (has("italic")) s = `*${s}*`;
      if (has("bold")) s = `**${s}**`;
      const link = n.marks?.find((m) => m.type === "link");
      if (link && link.type === "link") s = `[${s}](${link.attrs.href})`;
      return s;
    })
    .join("");
}

function listText(list: RichList, depth: number): string {
  return list.content
    .map((item, i) => {
      const bullet = list.type === "orderedList" ? `${i + 1}. ` : "- ";
      const pad = "  ".repeat(depth);
      return item.content
        .map((b, j) => (b.type === "paragraph" ? (j === 0 ? pad + bullet : pad + "  ") + inlineText(b.content) : listText(b, depth + 1)))
        .join("\n");
    })
    .join("\n");
}

/** The plain words of a rich document, written the way `text` writes them. */
export function docToText(doc: RichDoc): string {
  return doc.content.map((b) => (b.type === "paragraph" ? inlineText(b.content) : listText(b, 0))).join("\n\n");
}

/** The rich version to draw, or null when there is none or the words have since changed. */
export function richFor(content: { text?: unknown; rich?: unknown }): RichDoc | null {
  if (!content.rich || typeof content.text !== "string") return null;
  const parsed = RichDoc.safeParse(content.rich);
  if (!parsed.success) return null;
  return docToText(parsed.data) === content.text ? parsed.data : null;
}

// ------------------------------------------------------------------ from the editor

type Json = { type?: unknown; text?: unknown; content?: unknown; marks?: unknown; attrs?: Record<string, unknown> };
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

function cleanMarks(marks: unknown): RichMark[] | undefined {
  const out: RichMark[] = [];
  for (const m of arr(marks)) {
    if (m.type === "bold" || m.type === "italic" || m.type === "underline" || m.type === "strike") out.push({ type: m.type });
    else if (m.type === "link" && typeof m.attrs?.href === "string" && m.attrs.href.trim()) out.push({ type: "link", attrs: { href: m.attrs.href.trim().slice(0, 2000) } });
    else if (m.type === "color" && RichColor.safeParse(m.attrs?.color).success) out.push({ type: "color", attrs: { color: m.attrs!.color as string } });
  }
  return out.length ? out : undefined;
}

function cleanInline(content: unknown): RichInline[] {
  const out: RichInline[] = [];
  for (const n of arr(content)) {
    if (n.type === "hardBreak") out.push({ type: "hardBreak" });
    else if (n.type === "text" && typeof n.text === "string" && n.text) {
      const marks = cleanMarks(n.marks);
      out.push(marks ? { type: "text", text: n.text, marks } : { type: "text", text: n.text });
    } else if (n.content) out.push(...cleanInline(n.content));
  }
  return out;
}

const para = (content: RichInline[]): RichParagraph => (content.length ? { type: "paragraph", content } : { type: "paragraph" });

function cleanBlock(n: Json): RichBlock | null {
  if (n.type === "bulletList" || n.type === "orderedList") {
    const items = arr(n.content)
      .map((it) => {
        const content = arr(it.content)
          .map(cleanBlock)
          .filter((b): b is RichBlock => !!b);
        return content.length ? { type: "listItem" as const, content } : null;
      })
      .filter((x): x is RichList["content"][number] => !!x);
    return items.length ? { type: n.type, content: items } : null;
  }
  return para(cleanInline(n.content));
}

/** Whatever the editor produced, cut down to what the site may draw (or null if nothing is left). */
export function cleanDoc(json: unknown): RichDoc | null {
  const blocks = arr((json as Json | null)?.content)
    .map(cleanBlock)
    .filter((b): b is RichBlock => !!b);
  const parsed = RichDoc.safeParse({ type: "doc", content: blocks.length ? blocks : [{ type: "paragraph" }] });
  return parsed.success ? parsed.data : null;
}

/** True when `text` alone draws exactly this document, so there's no need to store `rich`. */
export function isPlain(doc: RichDoc): boolean {
  if (doc.content.length !== 1 || doc.content[0]!.type !== "paragraph") return false;
  return JSON.stringify(textToDoc(docToText(doc))) === JSON.stringify(doc);
}

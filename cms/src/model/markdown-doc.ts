/*
 * The Aerobotics blocks (and others) keep their words as short marked-up text: **bold**, *italic*,
 * [links](/path), a line break as "\n" and paragraphs split by a blank line, drawn by render/inline.
 * The in-place editor works on a document of paragraphs instead; these convert between the two,
 * so editing changes nothing about how a page is saved.
 */
export type MdMark = { type: "bold" } | { type: "italic" } | { type: "link"; attrs: { href: string } };
export type MdInline = { type: "text"; text: string; marks?: MdMark[] } | { type: "hardBreak" };
export type MdParagraph = { type: "paragraph"; content?: MdInline[] };
export type MdDoc = { type: "doc"; content: MdParagraph[] };

const INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)|\n/g;

function parseInline(text: string): MdInline[] {
  const out: MdInline[] = [];
  let last = 0;
  INLINE.lastIndex = 0;
  for (let m = INLINE.exec(text); m; m = INLINE.exec(text)) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "text", text: m[1], marks: [{ type: "bold" }] });
    else if (m[2] !== undefined) out.push({ type: "text", text: m[2], marks: [{ type: "italic" }] });
    else if (m[3] !== undefined) out.push({ type: "text", text: m[3], marks: [{ type: "link", attrs: { href: m[4]! } }] });
    else out.push({ type: "hardBreak" });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

/** Marked-up text → a document of paragraphs (always at least one). */
export function mdToDoc(md: string): MdDoc {
  const paras = md.split(/\n[ \t]*\n/).map((p) => p.replace(/^\n+|\n+$/g, ""));
  return {
    type: "doc",
    content: (paras.length ? paras : [""]).map((p) => {
      const content = parseInline(p);
      return content.length ? { type: "paragraph", content } : { type: "paragraph" };
    }),
  };
}

type AnyNode = { type?: string; text?: string; marks?: { type: string; attrs?: { href?: string } }[]; content?: AnyNode[] };

function inlineToMd(n: AnyNode): string {
  if (n.type === "hardBreak") return "\n";
  if (n.type !== "text" || !n.text) return "";
  const marks = n.marks ?? [];
  const link = marks.find((m) => m.type === "link")?.attrs?.href;
  // render/inline can't nest: a link keeps plain words, and bold wins over italic.
  if (link) return `[${n.text}](${link})`;
  // Spaces stay outside the stars ("** word**" wouldn't read as bold).
  const lead = /^\s*/.exec(n.text)![0];
  const tail = /\s*$/.exec(n.text)![0];
  const core = n.text.trim();
  if (!core) return n.text;
  if (marks.some((m) => m.type === "bold")) return `${lead}**${core}**${tail}`;
  if (marks.some((m) => m.type === "italic")) return `${lead}*${core}*${tail}`;
  return n.text;
}

/** A document back to marked-up text; lists and other blocks become plain paragraphs. */
export function docToMd(doc: AnyNode): string {
  const paras: string[] = [];
  const walk = (n: AnyNode) => {
    if (n.type === "paragraph" || n.type === "heading") paras.push((n.content ?? []).map(inlineToMd).join("").replace(/[ \t]+$/g, ""));
    else (n.content ?? []).forEach(walk);
  };
  walk(doc);
  while (paras.length > 1 && !paras[paras.length - 1]) paras.pop();
  return paras.join("\n\n");
}

/** What a visitor reads: the marks taken out, spaces evened out. */
export function plainOf(md: string): string {
  return md.replace(INLINE, (all, b, i, label) => (b ?? i ?? label ?? " ")).replace(/\s+/g, " ").trim();
}

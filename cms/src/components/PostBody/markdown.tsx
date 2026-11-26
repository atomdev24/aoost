import type { ReactNode } from "react";
import { inline } from "../../render/inline";
import { safeUrl } from "../../render/links";

/**
 * The blog writer's body: plain text with a few marks, turned into React nodes (never raw HTML).
 * Blank lines split blocks; "# " to "### " are headings, "- " lists, "> " quotes and a line that
 * is only ![alt](picture) is a picture. Inside a block: **bold**, *italic* and [links](url).
 */
export function markdownBlocks(text: string): ReactNode[] {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b, i) => {
    const h = /^(#{1,3})\s+(.*)$/s.exec(b);
    if (h) {
      const level = h[1]!.length + 1; // # → h2: the page title is the h1
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return <Tag key={i}>{inline(h[2]!)}</Tag>;
    }
    const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(b);
    if (img) {
      return (
        <figure key={i}>
          <img src={safeUrl(img[2]!)} alt={img[1]} loading="lazy" />
          {img[1] ? <figcaption>{img[1]}</figcaption> : null}
        </figure>
      );
    }
    const lines = b.split("\n");
    if (lines.every((l) => /^[-*]\s+/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-*]\s+/, ""))}</li>)}</ul>;
    if (lines.every((l) => /^\d+[.)]\s+/.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+[.)]\s+/, ""))}</li>)}</ol>;
    if (lines.every((l) => /^>\s?/.test(l))) return <blockquote key={i}>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join("\n"))}</blockquote>;
    return <p key={i}>{inline(b)}</p>;
  });
}

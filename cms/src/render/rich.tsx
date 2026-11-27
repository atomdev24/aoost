import { createElement, type ReactElement, type ReactNode } from "react";
import type { RichBlock, RichDoc, RichInline, RichList } from "../schema/rich";
import { RICH_SIZES } from "../schema/rich-sizes";
import { safeUrl } from "./links";

/**
 * Draws stored rich text as plain React elements: no HTML strings, nothing injected. Only the
 * marks and blocks in schema/rich.ts exist; colours are theme tokens or checked colour values.
 */

const colour = (c: string) => {
  const m = /^token:([a-zA-Z][a-zA-Z0-9]*)$/.exec(c);
  return m ? `var(--c-${m[1]})` : c;
};

function inlines(content: RichInline[] | undefined, key = 0): ReactNode[] {
  return (content ?? []).map((n, i) => {
    if (n.type === "hardBreak") return <br key={`${key}-${i}`} />;
    let el: ReactNode = n.text;
    for (const m of n.marks ?? []) {
      if (m.type === "bold") el = <strong>{el}</strong>;
      else if (m.type === "italic") el = <em>{el}</em>;
      else if (m.type === "underline") el = <u>{el}</u>;
      else if (m.type === "strike") el = <s>{el}</s>;
      else if (m.type === "color") el = <span style={{ color: colour(m.attrs.color) }}>{el}</span>;
      else if (m.type === "size") el = <span style={{ fontSize: `${RICH_SIZES[m.attrs.size]}em`, lineHeight: 1.15 }}>{el}</span>;
    }
    const link = n.marks?.find((m) => m.type === "link");
    if (link && link.type === "link") {
      const href = safeUrl(link.attrs.href);
      el = (
        <a href={href} {...(/^https?:/.test(href) ? { target: "_blank", rel: "noopener" } : {})}>
          {el}
        </a>
      );
    }
    return <span key={`${key}-${i}`}>{el}</span>;
  });
}

function list(l: RichList, key: string): ReactNode {
  return createElement(
    l.type === "orderedList" ? "ol" : "ul",
    { key },
    l.content.map((item, i) => <li key={i}>{item.content.map((b, j) => (b.type === "paragraph" ? <span key={j}>{inlines(b.content, j)}</span> : list(b, `${j}`)))}</li>),
  );
}

const block = (b: RichBlock, i: number): ReactNode => (b.type === "paragraph" ? <p key={i}>{b.content?.length ? inlines(b.content, i) : <br />}</p> : list(b, `l${i}`));

/**
 * The block's element with the document inside. One plain paragraph keeps the block's own tag
 * (a heading stays a heading); several paragraphs or a list in a paragraph block become a div of
 * paragraphs; a heading with several paragraphs keeps one heading with line breaks.
 */
export function renderRich(doc: RichDoc, tag: string, className: string): ReactElement {
  const only = doc.content.length === 1 && doc.content[0]!.type === "paragraph" ? doc.content[0] : null;
  if (only) return createElement(tag, { className }, inlines(only.content));
  if (tag === "p" || tag === "span") return createElement("div", { className: `${className} tx-flow` }, doc.content.map(block));
  const lines: ReactNode[] = [];
  doc.content.forEach((b, i) => {
    if (i) lines.push(<br key={`b${i}`} />);
    if (b.type === "paragraph") lines.push(...inlines(b.content, i));
    else lines.push(<span key={`l${i}`}>{b.content.map((it) => it.content.map((p) => (p.type === "paragraph" ? inlines(p.content) : null)))}</span>);
  });
  return createElement(tag, { className }, lines);
}

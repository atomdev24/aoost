import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanDoc, docToText, isPlain, richFor, textToDoc } from "./rich";
import { renderRich } from "../render/rich";
import type { RichDoc } from "../schema/rich";

const html = (doc: RichDoc, tag = "p") => renderToStaticMarkup(<>{renderRich(doc, tag, "tx t-body")}</>);

describe("rich text", () => {
  it("round-trips the plain text format", () => {
    for (const t of ["Hello", "**Bold** and *italic*\nnext line", "See [the work](/work) now", "5 * 3 = 15", ""]) {
      expect(docToText(textToDoc(t))).toBe(t);
      expect(isPlain(textToDoc(t))).toBe(true);
    }
  });

  it("writes colour, underline and lists as plain words", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Red", marks: [{ type: "color", attrs: { color: "token:rust" } }, { type: "bold" }] }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] }, { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] }] },
      ],
    };
    expect(docToText(doc)).toBe("**Red**\n\n- one\n- two");
    expect(isPlain(doc)).toBe(false);
  });

  it("draws the rich version only while it says what the text says", () => {
    const rich = textToDoc("Hi **there**");
    expect(richFor({ text: "Hi **there**", rich })).toEqual(rich);
    expect(richFor({ text: "Hola", rich })).toBeNull();
    expect(richFor({ text: "Hi", rich: { type: "doc", content: [{ type: "script" }] } })).toBeNull();
  });

  it("cleans what the editor hands over", () => {
    const doc = cleanDoc({
      type: "doc",
      content: [
        { type: "paragraph", attrs: { textAlign: "left" }, content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)", target: "_blank" } }, { type: "color", attrs: { color: "red;background:url(x)" } }, { type: "bold" }] }] },
        { type: "heading", content: [{ type: "text", text: "kept as a paragraph" }] },
        { type: "image", attrs: { src: "x" } },
      ],
    })!;
    expect(doc.content).toHaveLength(3);
    const first = doc.content[0]!;
    expect(first.type === "paragraph" && first.content?.[0]).toEqual({ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }, { type: "bold" }] });
    // The link is made safe when drawn.
    expect(html(doc)).toContain('href="#"');
    expect(html(doc)).not.toContain("javascript");
  });

  it("keeps a heading a heading, and turns paragraphs and lists into a flow", () => {
    expect(html(textToDoc("One"), "h2")).toBe('<h2 class="tx t-body"><span>One</span></h2>');
    const two: RichDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }, { type: "paragraph", content: [{ type: "text", text: "b", marks: [{ type: "underline" }] }] }] };
    expect(html(two)).toBe('<div class="tx t-body tx-flow"><p><span>a</span></p><p><span><u>b</u></span></p></div>');
    expect(html(two, "h1")).toBe('<h1 class="tx t-body"><span>a</span><br/><span><u>b</u></span></h1>');
    const col: RichDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "c", marks: [{ type: "color", attrs: { color: "token:rust" } }] }] }] };
    expect(html(col)).toContain('style="color:var(--c-rust)"');
  });
  it("keeps a few words bigger or smaller, and only the known sizes", () => {
    const doc = cleanDoc({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Big", marks: [{ type: "size", attrs: { size: "xl" } }] }, { type: "text", text: " small", marks: [{ type: "size", attrs: { size: "40px" } }] }] }] })!;
    expect(doc.content[0]).toEqual({ type: "paragraph", content: [{ type: "text", text: "Big", marks: [{ type: "size", attrs: { size: "xl" } }] }, { type: "text", text: " small" }] });
    expect(isPlain(doc)).toBe(false);
    expect(docToText(doc)).toBe("Big small");
    expect(html(doc)).toContain('style="font-size:1.6em;line-height:1.15"');
  });
});

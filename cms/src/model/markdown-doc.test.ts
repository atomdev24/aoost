import { describe, expect, it } from "vitest";
import { docToMd, mdToDoc, plainOf } from "./markdown-doc";

describe("marked-up text ↔ document", () => {
  const samples = [
    "Our Story",
    "We measure **every** fruit.\n\nThen *growers* decide. See [pricing](/pricing).",
    "Line one\nline two",
    "",
  ];
  it("goes there and back unchanged", () => {
    for (const s of samples) expect(docToMd(mdToDoc(s))).toBe(s);
  });
  it("reads marks", () => {
    const d = mdToDoc("a **b** *c* [d](/e)");
    expect(d.content[0]!.content).toEqual([
      { type: "text", text: "a " },
      { type: "text", text: "b", marks: [{ type: "bold" }] },
      { type: "text", text: " " },
      { type: "text", text: "c", marks: [{ type: "italic" }] },
      { type: "text", text: " " },
      { type: "text", text: "d", marks: [{ type: "link", attrs: { href: "/e" } }] },
    ]);
  });
  it("writes what the page can draw", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "both ", marks: [{ type: "bold" }, { type: "italic" }] }, { type: "text", text: "x", marks: [{ type: "bold" }, { type: "link", attrs: { href: "/y" } }] }] }] };
    expect(docToMd(doc)).toBe("**both** [x](/y)");
    expect(docToMd({ type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] }] }] })).toBe("one");
  });
  it("gives the words a visitor reads", () => {
    expect(plainOf("We  measure **every** fruit. [See](/x)\n*now*")).toBe("We measure every fruit. See now");
  });
});

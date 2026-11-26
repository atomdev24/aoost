import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { markdownBlocks } from "./markdown";

const html = (t: string) => renderToStaticMarkup(<>{markdownBlocks(t)}</>);

describe("blog writer body", () => {
  it("turns plain text into headings, lists, quotes, pictures and paragraphs", () => {
    expect(html("# Big\n\nHello **you**")).toBe("<h2>Big</h2><p>Hello <strong>you</strong></p>");
    expect(html("- one\n- two")).toBe("<ul><li>one</li><li>two</li></ul>");
    expect(html("> said")).toBe("<blockquote>said</blockquote>");
    expect(html("![Orchard](/media/a.jpg)")).toContain('<img src="/media/a.jpg" alt="Orchard"');
  });
  it("never passes raw HTML through", () => {
    expect(html("<script>x</script>")).toBe("<p>&lt;script&gt;x&lt;/script&gt;</p>");
  });
});

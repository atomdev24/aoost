import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

describe("FileDownload", () => {
  it("renders a download link with the file type", () => {
    const html = renderNode("FileDownload", { src: "/media/2026/zine.pdf", label: "The zine", note: "12 pages" });
    expect(html).toContain('<a class="file" href="/media/2026/zine.pdf" download="">');
    expect(html).toContain("PDF · 12 pages");
  });
  it("never links to a script URL", () => {
    expect(renderNode("FileDownload", { src: "javascript:alert(1)", label: "x" })).toContain('href="#"');
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

const code = { html: "<b>hi</b>", css: "b{color:red}", js: "document.title='x'", mode: "sandboxed" };

describe("Code block", () => {
  it("is sandboxed by default: scripts only, no access to the page", () => {
    const html = renderNode("Code", code);
    expect(html).toMatch(/<iframe class="code-frame" sandbox="allow-scripts" title="Custom code" data-frame="t1" srcDoc="/);
    expect(html).not.toContain("allow-same-origin");
    expect(html).toContain("&lt;b&gt;hi&lt;/b&gt;"); // the code lives inside srcdoc, escaped
    expect(html).toContain("aoostFrame"); // reports its height so the frame can size itself
  });
  it("inline mode puts the code in the page", () => {
    const html = renderNode("Code", { ...code, mode: "inline" });
    expect(html).toBe('<div class="code-inline" data-code="inline"><style>b{color:red}</style><b>hi</b><script>document.title=\'x\'</script></div>');
  });
  it("never runs inline scripts inside the editor", () => {
    const html = renderNode("Code", { ...code, mode: "inline" }, { editing: true });
    expect(html).toContain("<b>hi</b>");
    expect(html).not.toContain("<script>");
  });
  it("can't close its own script or style early", () => {
    const html = renderNode("Code", { html: "", css: "</style><p>", js: "x='</script><img>'", mode: "inline" });
    expect(html).not.toContain("</style><p>");
    expect(html).not.toContain("</script><img>");
  });
  it("is empty when there is no code", () => {
    expect(renderNode("Code", { html: "", css: "", js: "", mode: "sandboxed" })).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

describe("Image as a button", () => {
  const base = { src: "/media/a.jpg", alt: "A", width: 800, height: 600 };
  it("links the picture and presses in by default", () => {
    const html = renderNode("Image", { ...base, link: { kind: "url", url: "/work/" } });
    expect(html).toContain('<a href="/work/" class="press">');
    expect(html).not.toContain("data-lightbox");
  });
  it("opens other sites in a new tab, and can skip the press", () => {
    const html = renderNode("Image", { ...base, link: { kind: "url", url: "https://aerobotics.com" }, press: "none" });
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain('class="press"');
  });
  it("has no link while editing, and no link when the address is empty", () => {
    expect(renderNode("Image", { ...base, link: { kind: "url", url: "/work/" } }, { editing: true })).not.toContain("<a");
    expect(renderNode("Image", { ...base, link: { kind: "url", url: "" } })).not.toContain("<a");
  });
  it("asks for a file as wide as the screen, more when zoomed in its frame", () => {
    expect(renderNode("Image", base)).toContain('sizes="100vw"');
    const zoomed = renderNode("Image", base, { node: { frame: { base: { fit: "free", focalX: 50, focalY: 50, zoom: 2, panX: 0, panY: 0 } } } });
    expect(zoomed).toContain('sizes="200vw"');
  });
});

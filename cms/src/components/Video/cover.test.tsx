import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

const base = { source: "link", src: "", url: "https://youtu.be/27Aj5-LUDUU", autoplay: false, loop: false, controls: true };

describe("Video cover for YouTube and Vimeo", () => {
  it("shows our cover, corner line and play style; loads nothing from YouTube until play", () => {
    const html = renderNode("Video", { ...base, poster: "/art/a.webp", play: "glass", title: "TrueFruit", channel: "Aerobotics", duration: "2:40" });
    expect(html).toContain("vid-p-glass");
    expect(html).toContain("<b>TrueFruit</b><small>Aerobotics</small>");
    expect(html).toContain('class="vid-dur">2:40');
    expect(html).toContain('data-video-embed="https://www.youtube-nocookie.com/embed/27Aj5-LUDUU?playsinline=1&amp;rel=0&amp;autoplay=1"');
    expect(html).not.toContain("<iframe");
  });
  it("uses YouTube's thumbnail when a play style is set without a poster", () => {
    expect(renderNode("Video", { ...base, play: "disc" })).toContain("https://i.ytimg.com/vi/27Aj5-LUDUU/maxresdefault.jpg");
  });
  it("puts the length inside the pill, and never starts the player while editing", () => {
    const html = renderNode("Video", { ...base, poster: "/art/a.webp", play: "pill", duration: "2:40" }, { editing: true });
    expect(html).toContain('vid-pill-dur">2:40');
    expect(html).not.toContain("vid-dur\"");
    expect(html).not.toContain("data-video-embed");
  });
});

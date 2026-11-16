import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

const base = { source: "upload", src: "/media/2026/a.mp4", autoplay: true, loop: true, controls: false };

describe("Video", () => {
  it("autoplays muted and inline, looping, without controls", () => {
    const html = renderNode("Video", base);
    expect(html).toMatch(/<video class="media" src="\/media\/2026\/a.mp4"[^>]*muted=""[^>]*playsInline=""[^>]*loop=""[^>]*autoPlay=""/);
    expect(html).not.toContain("controls");
  });
  it("plays only in view when asked, and never autoplays in the editor", () => {
    expect(renderNode("Video", { ...base, playInView: true })).toContain('data-inview=""');
    expect(renderNode("Video", { ...base, playInView: true })).not.toContain("autoPlay");
    expect(renderNode("Video", base, { editing: true })).not.toContain("autoPlay");
  });
  it("shows controls when it does not autoplay", () => {
    expect(renderNode("Video", { ...base, autoplay: false })).toContain('controls=""');
  });
  it("gives phones a lighter file or a still", () => {
    expect(renderNode("Video", { ...base, mobileSrc: "/media/2026/small.mp4" })).toContain('data-mobile-src="/media/2026/small.mp4"');
    const still = renderNode("Video", { ...base, poster: "/art/hero.jpg", mobileStill: true, alt: "Studio" });
    expect(still).toContain("vid-still-mobile");
    expect(still).toContain('<img class="media vid-still" src="/art/hero.960.webp"');
  });
  it("embeds YouTube and Vimeo, loading the player on click when there is a poster", () => {
    const direct = renderNode("Video", { ...base, source: "link", url: "https://youtu.be/dQw4w9WgXcQ" });
    expect(direct).toContain('<iframe class="media" data-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?playsinline=1&amp;rel=0&amp;loop=1&amp;controls=0"');
    const facade = renderNode("Video", { ...base, source: "link", url: "https://vimeo.com/123", poster: "/art/hero.jpg", alt: "Reel" });
    expect(facade).toContain('data-video-embed="https://player.vimeo.com/video/123?dnt=1&amp;loop=1&amp;controls=0&amp;autoplay=1"');
    expect(facade).toContain('aria-label="Play Reel"');
    expect(facade).not.toContain("<iframe");
  });
  it("renders nothing when empty on the public site", () => {
    expect(renderNode("Video", { ...base, src: "" })).toBe("");
    expect(renderNode("Video", { ...base, source: "link", url: "https://open.spotify.com/track/x" })).toBe("");
  });
});

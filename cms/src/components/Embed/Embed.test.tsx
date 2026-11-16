import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";
import { embedFor } from "./providers";

describe("embedFor", () => {
  it("handles Spotify playlists, tracks and the compact player", () => {
    expect(embedFor("https://open.spotify.com/playlist/2FeVxQ6ZPLOAuoejGJj9Fb?si=abc")).toMatchObject({ provider: "spotify", src: "https://open.spotify.com/embed/playlist/2FeVxQ6ZPLOAuoejGJj9Fb", height: 352 });
    expect(embedFor("https://open.spotify.com/intl-nl/track/abc123")).toMatchObject({ src: "https://open.spotify.com/embed/track/abc123", height: 152 });
    expect(embedFor("https://open.spotify.com/album/xyz", { compact: true })!.height).toBe(152);
  });
  it("handles YouTube in all its shapes, without cookies", () => {
    for (const url of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3", "https://youtu.be/dQw4w9WgXcQ", "https://m.youtube.com/embed/dQw4w9WgXcQ"]) {
      expect(embedFor(url)).toMatchObject({ provider: "youtube", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", aspect: "16/9" });
    }
    expect(embedFor("https://youtube.com/shorts/abc")!.aspect).toBe("9/16");
  });
  it("handles Vimeo, SoundCloud, Instagram and Maps", () => {
    expect(embedFor("https://vimeo.com/channels/staff/123456")!.src).toBe("https://player.vimeo.com/video/123456");
    expect(embedFor("https://soundcloud.com/artist/track-name")).toMatchObject({ provider: "soundcloud", height: 166 });
    expect(embedFor("https://soundcloud.com/artist/sets/mix")!.src).toContain(encodeURIComponent("https://soundcloud.com/artist/sets/mix"));
    expect(embedFor("https://www.instagram.com/p/Cabc_12/?igsh=x")!.src).toBe("https://www.instagram.com/p/Cabc_12/embed");
    expect(embedFor("https://www.google.com/maps/place/Marfa,+TX/@30.3,-104")!.src).toBe("https://www.google.com/maps?q=Marfa%2C%20TX&output=embed");
    expect(embedFor("https://www.google.com/maps/embed?pb=!1m18")!.src).toBe("https://www.google.com/maps/embed?pb=!1m18");
  });
  it("refuses everything else", () => {
    for (const url of ["", "not a url", "javascript:alert(1)", "https://evil.example/embed", "https://open.spotify.com/", "https://www.google.com/search?q=x"]) expect(embedFor(url)).toBeNull();
  });
});

describe("Embed component", () => {
  it("renders a sandboxed iframe sized for the provider, which loads only when scrolled near", () => {
    const html = renderNode("Embed", { url: "https://youtu.be/dQw4w9WgXcQ" });
    expect(html).toContain('<iframe data-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(renderNode("Embed", { url: "https://youtu.be/dQw4w9WgXcQ" }, { editing: true })).toContain('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("aspect-ratio:16/9");
    expect(html).toContain("sandbox=");
  });
  it("renders nothing for a bad link on the public site, a hint in the editor", () => {
    expect(renderNode("Embed", { url: "https://evil.example" })).toBe("");
    expect(renderNode("Embed", { url: "" }, { editing: true })).toContain("Paste a link");
  });
});

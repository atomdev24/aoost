import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

describe("SpotifyEmbed", () => {
  it("embeds a playlist from a link or a bare id", () => {
    for (const url of ["https://open.spotify.com/playlist/2FeVxQ6ZPLOAuoejGJj9Fb", "2FeVxQ6ZPLOAuoejGJj9Fb"]) {
      const html = renderNode("SpotifyEmbed", { url, compact: false });
      expect(html).toContain('src="https://open.spotify.com/embed/playlist/2FeVxQ6ZPLOAuoejGJj9Fb"');
      expect(html).toContain("height:352px");
    }
  });
  it("has a compact player and refuses non-Spotify links", () => {
    expect(renderNode("SpotifyEmbed", { url: "2FeVxQ6ZPLOAuoejGJj9Fb", compact: true })).toContain("height:152px");
    expect(renderNode("SpotifyEmbed", { url: "https://youtu.be/abc", compact: false })).toBe("");
  });
});

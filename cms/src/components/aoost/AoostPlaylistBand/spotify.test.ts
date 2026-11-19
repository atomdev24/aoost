import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fmtDuration, parseEmbed, spotifyId } from "./spotify";

const fixture = readFileSync(resolve(__dirname, "fixtures/embed-playlist.html"), "utf8");

describe("Spotify embed parsing", () => {
  it("reads the name and every track (title, artist, duration, URI) from a saved embed page", () => {
    const p = parseEmbed(fixture);
    expect(p.name).toBe("Disc - 1 - Rock");
    expect(p.tracks).toHaveLength(11);
    expect(p.tracks[0]).toEqual({ title: "Tonight (demo)", artist: "Amira Elfeky", durationMs: 194666, uri: "spotify:track:6p5duPGjAdVYLq2kOGXYUD" });
    expect(p.tracks[4]!.artist).toBe("✝✝✝ (Crosses)");
  });
  it("keeps local files listed but without a playable URI", () => {
    expect(parseEmbed(fixture).tracks[10]).toEqual({ title: "Voice memo", artist: "", durationMs: 61000, uri: "" });
  });
  it("fails loudly on a page without the data", () => {
    expect(() => parseEmbed("<html><body>Page not found</body></html>")).toThrow(/__NEXT_DATA__/);
    expect(() => parseEmbed('<script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>')).toThrow(/track list/);
  });
  it("takes links, URIs and bare ids, and formats durations", () => {
    expect(spotifyId("https://open.spotify.com/playlist/2FeVxQ6ZPLOAuoejGJj9Fb?si=abc")).toBe("2FeVxQ6ZPLOAuoejGJj9Fb");
    expect(spotifyId("spotify:playlist:3PbXJWUZ4RooUU0aSSdDi0")).toBe("3PbXJWUZ4RooUU0aSSdDi0");
    expect(spotifyId("6KYCNr0X6Zt189pYxHMx1j")).toBe("6KYCNr0X6Zt189pYxHMx1j");
    expect([fmtDuration(194666), fmtDuration(61000), fmtDuration(3723000), fmtDuration(0)]).toEqual(["3:15", "1:01", "1:02:03", ""]);
  });
});

import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AoostPlaylistBand, frameName } from "./AoostPlaylistBand";

const d = AoostPlaylistBand.defaults.content;

describe("AoostPlaylistBand", () => {
  it("keeps the original band, toolbar and Spotify host with the ids the script drives", () => {
    const html = renderNode("AoostPlaylistBand", d);
    expect(html).toContain('<section class="cv focus-sec" id="band" aria-labelledby="h-pl">');
    expect(html).toContain('<div class="head cv-head"><h2 id="h-pl" data-underline="3">playlists</h2></div>');
    expect(html).toContain('<p class="cv-pg" id="h-discs"><b>aoost</b> / Page 1 / playlist</p>');
    for (const id of ["cvIn", "discs", "cvCursor", "mw", "mwPrev", "mwPlay", "mwNext", "mwTitle", "mwTime", "mwWave", "mwFill", "mwOpen", "spHost"]) expect(html, id).toContain(`id="${id}"`);
    expect(html).toContain("Tap play on the player below. Tap a disc to switch playlists.");
  });
  it("defaults to today's three live playlists on the dark mat", () => {
    expect(d.playlists.map((p) => [p.title, p.spotify, p.cover])).toEqual([
      ["Rock", "2FeVxQ6ZPLOAuoejGJj9Fb", "/art/cover-disc1.jpg"],
      ["Alt", "3PbXJWUZ4RooUU0aSSdDi0", "/art/cover-disc2.jpg"],
      ["H | T | R", "6KYCNr0X6Zt189pYxHMx1j", "/art/cover-disc3.jpg"],
    ]);
    expect(AoostPlaylistBand.band!(d)).toBe("mat mat-dark");
  });
  it("draws a frame per playlist, the first selected", () => {
    const html = renderNode("AoostPlaylistBand", d);
    expect(html.match(/class="cv-frame"/g)).toHaveLength(3);
    expect(html).toContain('<div class="cv-frame" data-on="1"><span class="cv-fl">Disc 1 · Rock</span>');
    expect(html).toContain('<span id="mwTitle">Rock</span>');
  });
  it("names frames the way the script does", () => {
    expect(frameName("Disc - 1 - Rock", 4)).toBe("Disc 1 · Rock");
    expect(frameName("Late - nights", 0)).toBe("Late · nights");
    expect(frameName("Alt", 1)).toBe("Disc 2 · Alt");
  });
  it("skips hidden playlists and ones without a Spotify link", () => {
    const html = renderNode("AoostPlaylistBand", { ...d, playlists: [...d.playlists, { title: "Secret", spotify: "abc", hidden: true }, { title: "Empty", spotify: "" }] });
    expect(html.match(/class="cv-frame"/g)).toHaveLength(3);
  });
});

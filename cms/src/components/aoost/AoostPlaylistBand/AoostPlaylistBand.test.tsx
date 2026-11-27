import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderNode } from "../../test-utils";
import { AoostPlaylistBand, SHOWN_TRACKS, Tracklist, tracksFor, type AoostPlaylist } from "./AoostPlaylistBand";

const d = AoostPlaylistBand.defaults.content;
const count = (html: string, re: RegExp) => html.match(re)?.length ?? 0;

describe("AoostPlaylistBand", () => {
  it("defaults to today's three live playlists on the dark band", () => {
    expect(d.playlists.map((p) => [p.title, p.spotify, p.cover])).toEqual([
      ["Rock", "2FeVxQ6ZPLOAuoejGJj9Fb", "/art/cover-disc1.jpg"],
      ["Alt", "3PbXJWUZ4RooUU0aSSdDi0", "/art/cover-disc2.jpg"],
      ["H | T | R", "6KYCNr0X6Zt189pYxHMx1j", "/art/cover-disc3.jpg"],
    ]);
    expect(AoostPlaylistBand.band!(d)).toBe("mat mat-dark");
  });

  it("has a heading, one chip per playlist and no crumb or hint", () => {
    const html = renderNode("AoostPlaylistBand", d);
    expect(html).toContain('<div class="head pl-head"><h2 id="h-pl" data-underline="3">Playlists</h2></div><div class="pl-chips" role="group" aria-label="Playlists">');
    expect(html).toContain('<button class="pl-chip" type="button" data-i="0" aria-pressed="true">Rock</button>');
    expect(html).toContain('<button class="pl-chip" type="button" data-i="2" aria-pressed="false">H | T | R</button>');
    expect(html).not.toMatch(/cv-pg|sp-hint|Page 1/);
    expect(html).toContain('<div id="spHost"></div>');
  });

  it("shows the first playlist's sleeve and tracklist, the others hidden", () => {
    const html = renderNode("AoostPlaylistBand", d);
    expect(count(html, /class="pl-rec"/g)).toBe(3);
    expect(html).toContain('<figure class="pl-rec" data-i="0"><div class="pl-sleeve"><img src="/art/cover-disc1.960.webp"');
    expect(html).toContain('<figure class="pl-rec" data-i="1" hidden="">');
    expect(html).toContain('<div class="pl-list" data-i="0"><ol');
    expect(html).toContain('<div class="pl-list" data-i="2" hidden="">');
  });

  it("renders the tracklist: number, track · artist, duration, the first marked, then + N more", () => {
    const tracks = Array.from({ length: 11 }, (_, k) => ({ title: `Song ${k + 1}`, artist: `Band ${k + 1}`, durationMs: 61000 + k * 1000, uri: `spotify:track:t${k + 1}` }));
    const p: AoostPlaylist = { title: "Test", spotify: "https://open.spotify.com/playlist/abc" };
    expect(tracksFor(p, { abc: { name: "Test", tracks } })).toBe(tracks);
    const html = renderToStaticMarkup(<Tracklist playlist={p} tracks={tracks} index={0} shown />);
    expect(count(html, /<li>/g)).toBe(SHOWN_TRACKS);
    expect(html).toContain('<ol class="pl-tracks" aria-label="Test tracks"><li><button class="pl-track" type="button" data-uri="spotify:track:t1" aria-current="true"><span class="pl-n">01</span><span class="pl-tt"><span class="pl-ti">Song 1</span><span class="pl-ar"> · Band 1</span></span><span class="pl-du">1:01</span></button></li>');
    expect(html).toContain('<button class="pl-track" type="button" data-uri="spotify:track:t8"><span class="pl-n">08</span>');
    expect(html).not.toContain("t9");
    expect(count(html, /aria-current/g)).toBe(1);
    expect(html).toContain('<a class="pl-more" href="https://open.spotify.com/playlist/abc" target="_blank" rel="noopener">+ 3 more · open in Spotify ↗</a>');
  });

  it("lets a manual tracklist replace the fetched one", () => {
    const p: AoostPlaylist = { title: "Rock", spotify: "2FeVxQ6ZPLOAuoejGJj9Fb", tracks: [{ title: "First", artist: "Someone" }, { title: " " }, { title: "Second" }] };
    expect(tracksFor(p)).toEqual([
      { title: "First", artist: "Someone", durationMs: 0, uri: "" },
      { title: "Second", artist: "", durationMs: 0, uri: "" },
    ]);
    const html = renderNode("AoostPlaylistBand", { ...d, playlists: [p] });
    expect(html).toContain('<span class="pl-track" aria-current="true"><span class="pl-n">01</span><span class="pl-tt"><span class="pl-ti">First</span><span class="pl-ar"> · Someone</span></span><span class="pl-du"></span></span>');
    expect(html).toContain("open in Spotify ↗</a>");
    expect(html).not.toContain("more ·");
  });

  it("lists the committed Spotify copy for today's playlists, first 8 as playable buttons", () => {
    const html = renderNode("AoostPlaylistBand", d);
    const first = tracksFor(d.playlists[0]!);
    expect(first.length).toBeGreaterThan(SHOWN_TRACKS);
    const list0 = html.split('<div class="pl-list" data-i="0">')[1]!.split('<div class="pl-list" data-i="1"')[0]!;
    expect(count(list0, /<button class="pl-track"/g)).toBe(SHOWN_TRACKS);
    expect(list0).toContain(`data-uri="${first[0]!.uri}" aria-current="true"`);
    expect(count(list0, /aria-current/g)).toBe(1);
    expect(list0).toContain(`+ ${first.length - SHOWN_TRACKS} more · open in Spotify ↗`);
  });

  it("skips hidden playlists and ones without a Spotify link", () => {
    const html = renderNode("AoostPlaylistBand", { ...d, playlists: [...d.playlists, { title: "Secret", spotify: "abc", hidden: true }, { title: "Empty", spotify: "" }] });
    expect(count(html, /class="pl-chip"/g)).toBe(3);
    expect(html).toContain('{"playlists":[{"id":"2FeVxQ6ZPLOAuoejGJj9Fb"},{"id":"3PbXJWUZ4RooUU0aSSdDi0"},{"id":"6KYCNr0X6Zt189pYxHMx1j"}]}');
  });
});

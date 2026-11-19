// Refresh the playlists band's track lists from Spotify's public embed pages (no API key).
//   npm run playlists:refresh
// Reads every AoostPlaylistBand in content/pages, fetches each playlist's embed page, and writes
// src/generated/playlists.json. A playlist that can't be fetched keeps its last good copy, and the
// script never fails the build: offline builds simply use the committed file.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { embedUrl, parseEmbed, spotifyId, type GeneratedPlaylists } from "../src/components/aoost/AoostPlaylistBand/spotify";

const cms = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(cms, "..");
const out = resolve(cms, "src/generated/playlists.json");

function playlistIds(): string[] {
  const ids = new Set<string>();
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (o.type === "AoostPlaylistBand" && o.content && typeof o.content === "object") {
      for (const p of ((o.content as { playlists?: { spotify?: string }[] }).playlists ?? [])) {
        const id = spotifyId(p?.spotify);
        if (id) ids.add(id);
      }
    }
    Object.values(o).forEach(walk);
  };
  const dir = resolve(repo, "content/pages");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) walk(JSON.parse(readFileSync(resolve(dir, f), "utf8")));
  return [...ids];
}

const previous: GeneratedPlaylists = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { playlists: {} };
const next: GeneratedPlaylists = { playlists: {} };
let fetched = 0;
for (const id of playlistIds()) {
  try {
    const res = await fetch(embedUrl(id), { headers: { "User-Agent": "Mozilla/5.0 (compatible; site-build)", "Accept-Language": "en" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const playlist = parseEmbed(await res.text());
    if (!playlist.tracks.length) throw new Error("the page listed no tracks");
    next.playlists[id] = playlist;
    fetched++;
  } catch (e) {
    const kept = previous.playlists[id];
    if (kept) next.playlists[id] = kept;
    console.warn(`playlists:refresh: ${id}: ${e instanceof Error ? e.message : e}; ${kept ? "keeping the last good copy" : "no copy yet"}`);
  }
}

const body = JSON.stringify(next, null, 2) + "\n";
mkdirSync(dirname(out), { recursive: true });
if (!existsSync(out) || readFileSync(out, "utf8") !== body) writeFileSync(out, body);
console.log(`playlists:refresh: ${fetched}/${Object.keys(next.playlists).length} fetched from Spotify → src/generated/playlists.json`);

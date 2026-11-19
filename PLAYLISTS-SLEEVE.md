# Task: playlists as sleeve and tracklist, plus small homepage text changes

Alex chose these on 19 Nov 2026. See the design canvas (https://claude.ai/artifact/CkfE64KhFqkR9rQQM5G8Sy), board "Playlists 2 · Sleeve and tracklist". You're in a git worktree on branch `playlists-sleeve`. Commit after each step. Never push or touch `main`; Claude merges.

Follow `CLAUDE.md`:
- use `npm_config_cache=/tmp/aoost-npm-cache`;
- **don't start a dev server on port 8787** (another build in `~/aoost` uses it); use another port for browser tests, if the config allows it;
- **never commit `cms/node_modules`** (it's a symlink here, and it's ignored).

## Tone

Barely there: very few words, lowercase-feeling, no instructions to the visitor. Section headings are in sentence case.

## 1. Playlists band → sleeve and tracklist (AoostPlaylistBand)

- **Picking a playlist:** small pill chips with the playlist titles. Remove the "aoost / Page 1 / playlist" crumb and the hint line from the design, and add **no line** under the heading.
- **Disc and sleeve:** the selected playlist's disc slides half out of a plain sleeve that shows its cover. Animate the slide when the playlist changes, and respect `prefers-reduced-motion`.
- **Tracklist:** beside the sleeve, a numbered list (number, track · artist, duration), with the current track marked. Show the first ~8 tracks with "+ N more · open in Spotify ↗". Clicking a track plays it.
- **Track data:** fetch it **at build time** from Spotify's public embed page (`https://open.spotify.com/embed/playlist/<id>`). It carries the track list as JSON in the page (look for `__NEXT_DATA__` or the equivalent).
  - Parse title, artist, duration and track URI.
  - Write the result to a generated content file (for example `content/generated/playlists.json`), committed so builds don't depend on Spotify being up.
  - Refresh it on each deploy build when the network allows, and keep the last good copy when it doesn't.
  - Don't add any API keys or secrets.
  - Write a small script (`npm run playlists:refresh`) and run it now to create the first copy for the three playlists.
- **Playback:** use Spotify's own embed through the **Spotify iFrame API**, as a compact player under the tracklist; `controller.loadUri` plays the clicked track. Logged-out visitors get Spotify's 30-second previews; that's expected, so add no copy about it.
- **Look and responsiveness:**
  - Keep the dark band and the current fonts.
  - Mobile: the sleeve goes on top, with the tracklist underneath.
  - Work on all four sizes (mobile, tablet, desktop, widescreen).
- **Editor:** playlists keep title, Spotify id and cover, and gain an optional **manual tracklist override** (title and artist rows) for when the fetch fails.
- **Name:** keep the block name "playlists".

## 2. Small text changes (content and code)

- **Rodeo:** no heading. Make the `heading` optional, and render no heading element when it's empty. In the content, set it to empty.
- **Footer:** add an optional `line` to AoostFooter, rendered quietly before the existing "aoost · 2026". In the content, set it to: `Things I make, when I get to them.`
- **Section headings:** make every homepage section heading sentence case, for example "Projects", "Journals", "Playlists". Alex may rename them later, so keep the headings as content, not code.

## Done means

- **Unit tests:**
  - parsing the embed JSON, against a saved fixture, not the network;
  - the tracklist render;
  - the empty rodeo heading;
  - the footer line.
- **Browser test** on the draft preview: switch the playlist, the tracklist updates, and clicking a track calls the embed controller (stub the Spotify iFrame API).
- **Screenshots:** `docs/screenshots/playlists/` at 1440 and 390.
- **Checks:**
  - all unit tests and the build pass;
  - only the homepage changes in public output: compare the other pages against `main`, built with the timestamp pinned.
- **Summary:** append a short summary to `DECISIONS.md`.

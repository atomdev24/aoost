# Task: bring the original homepage into the editor

## The problem

The current homepage (`index.html` at the repo root, the live GitHub Pages site) is the layout Alex designed and wants to keep. The `cms-v1` run rebuilt `content/pages/home.json` from generic blocks, so the new homepage at `/` looks completely different. Alex wants **the original homepage, looking and behaving the same**, inside the editor, so he can change it later without rebuilding it by hand.

## The goal

`/` on the CMS site matches `index.html` visually and behaviourally, at 390px and 1440px. Every section is an editor block with its content editable.

## Approach (decided)

Make one **bespoke block per original section** in `cms/src/components/aoost/`, registered in the editor under an "aoost" category. Then rebuild `content/pages/home.json` from those blocks, in the original order.

Original sections, from `index.html`:

| Block | Original | Make editable |
|---|---|---|
| `AoostHero` | `header.hero-rect`: the `#wrap` line-art (cactus, skull, scorpion), `#reel`, `#clock`, `#hrBar`, `#ticker` | headline and copy, ticker items, reel images, clock time zone/label, which line-art pieces show |
| `AoostProjects` | `#h-proj` section: `#table`, `#keychain`, `#addArt` | the project list (title, year, medium, image(s), link, tags) and the section heading |
| `AoostJournals` | `.journals`: `#jrShelf` | journal list (title, cover, date, pages/images, link) and heading |
| `AoostTools` | `.skills`: `#h-tools` | tools/skills list and heading |
| `AoostPlaylistBand` | `#band` editor band: `#discs`, `#cvCursor`, mini player `#mw*`, `#spHost` | playlists (title, Spotify URL, cover, colour), heading, copy |
| `AoostDrawingWall` | `#h-wall` (currently `hidden`): `#ps`, palette, layers, `#board`, canvases, save, toast | on/off (keep it hidden by default, as now), heading, palette colours |
| `AoostRodeo` | `#h-rodeo`: `#rodeo` canvas, `#tumblePath`, leaderboard `#lb*` | heading, copy, on/off for the leaderboard. Keep the Supabase project and keys exactly as `index.html` uses them |
| `AoostViewer` | `#viewer` lightbox | none: a global behaviour used by the blocks above |
| `AoostFooter` | `footer` | footer text and links (from `site.json` socials) |

## Rules

- **Port, don't redesign.** Lift the original markup, CSS and JS for each section into its block, scoped so the styles can't leak (prefix classes or use a wrapper). Keep the `data-boot` scripts' behaviour. The interactive mechanics (game, drawing wall, discs, mini player, clock, reel) must work exactly as before.
- **Content comes from fields, not hard-coded markup.** Every bit of text, image, list item and link in the table above becomes a block field, with array fields for lists. Pull today's real content out of `index.html` and `art/` into those fields, so the default content is identical to the live site.
- **The original page structure stays the same.** Section order, spacing, the `focus-sec` behaviour, the fonts the original uses (including the Lexend stand-in, unless Facile Sans is how the original looks), colours and motion.
- **Images:** keep using the files in `art/` (copy them into the media pipeline if needed). Don't change or move anything in `art/`.
- Blocks should still accept the normal frame/section controls where it makes sense (spacing, visibility per breakpoint, hide/show), but they don't need to become free-canvas layouts.
- The Claude connector (`/mcp`) must be able to read and edit these blocks' fields like any other block.
- Don't change `index.html`, `CNAME`, `art/` or anything outside the `cms/` and `content/` folders, except docs.
- Same working rules as `CLAUDE.md`: branch `cms-v1`, commit after each block, log decisions in `DECISIONS.md` and anything that needs Alex in `BLOCKERS.md`, never touch `main`, and never print secrets. On this Mac, use `npm_config_cache=/tmp/aoost-npm-cache` for npm/npx.

## Done means

1. `content/pages/home.json` is built only from the aoost blocks, in the original order.
2. **Visual match.** Playwright screenshots of the original `index.html` and the new `/` at 390px and 1440px, committed side by side to `docs/screenshots/homepage-compare/`. Fix differences until they're close to identical, and list any that remain in `DECISIONS.md` with the reason.
3. **Behaviour check in a browser.** The clock ticks, the ticker moves, the reel runs, the playlist discs and mini player work, the rodeo game plays and the leaderboard loads, the lightbox opens, and the drawing wall works when switched on.
4. **Editability check.** In the editor: change a project title, swap a reel image, add a playlist, reorder two sections, hide the tools section, then publish. All of it renders correctly on the preview.
5. Tests pass and the build passes. The site is deployed to the `workers.dev` preview with `npm run deploy:preview`.
6. Push to `cms-v1` (the open PR updates itself) and finish with a short plain-English summary for Alex: what's editable in each section, and anything that differs from the original.

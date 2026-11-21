# aoost CMS handbook

Read this first. It is the current picture of the CMS and visual editor: what it is, how it is
built, how to work on it, and where it is going. `SPEC.md` is the original spec (still right on the
content model; some details have moved on). `DECISIONS.md` is the running log of choices.
`ROADMAP.md` holds the agreed next steps and the decisions behind them.

Last updated 19 Nov 2026.

## 1. What it is

A Framer-style visual editor and CMS. It was built for Alex's art site (alexoostendurp.com) and is
being grown into one editor that can also run the Aerobotics website once that moves in-house.
The plan is one shared editor ("the engine") with a site pack per website; they can be split into
separate deployments later. Until the split, everything lives in this repo.

- Public site: static HTML/CSS pre-rendered from JSON content, minimal JS.
- Editor: `/admin` (dark, Photoshop/Figma-style workspace, infinite board with one frame per
  breakpoint, inspector, layers, media, pages, command palette, phone layout).
- Claude connector: `/mcp` (MCP over HTTP) so Claude can read and edit the draft live.

## 2. Stack

| Concern | What |
| --- | --- |
| Code | TypeScript, React, Vite; editor engine is Puck (`@puckeditor/core`) with our own components, fields and board |
| Hosting | One Cloudflare Worker (`aoost-cms`) serves the site, `/admin`, `/api/*`, `/mcp`, `/media/*` |
| Content | JSON in `content/` (site.json, collections.json, pages/*.json), versioned by git |
| Draft | A Durable Object (`DraftStore`) holds the working draft, broadcasts edits over WebSocket to every open editor, merges new deploys into the draft (three-way) |
| Media | Cloudflare R2 bucket `aoost-media`, served and resized through the Worker |
| Auth | Cloudflare Access in front of `/admin`, `/api/editor/*`, `/mcp` (each person signs in with their email). Local dev uses a password (`AUTH_MODE=password`, `EDITOR_PASSWORD` in `.dev.vars`) |
| Publish | The editor commits `content/` to GitHub via the API; the "Deploy CMS" Action tests, builds and runs `wrangler deploy` |
| Cost | Free tiers only |

## 3. Map of the code (`cms/src`)

| Folder | What lives there |
| --- | --- |
| `schema/` | Zod content model: Site, Page, Section, Node, Responsive values, validation |
| `model/` | Pure logic: page ops, op log and diffs, three-way merge, nav, library, board references (`refs.ts`) |
| `render/` | Turns content into HTML/CSS (the same renderer for the public site, preview and editor frames) |
| `responsive/` | Breakpoint resolution (mobile base → tablet; desktop → widescreen) |
| `components/` | Blocks. Generic ones (Text, Image, Video, Gallery, Embed…) and the site pack `components/aoost/` (Hero, Projects, Journals, Playlists, Rodeo…). Each block: component, Puck fields, styles, test |
| `components/aoost/runtime/` | Small plain-JS runtimes for the public site (projects table, viewer, journals, playlists) |
| `editor/` | The editor app. `board/` (infinite canvas, frames, zoom, references), `workspace/` (top bar, rail, inspector, publish), `fields/` (custom inspector controls), `canvas/` (drops, image adjust, resize), `commands/` (palette, shortcuts), `touch/` (phone gestures), `ui/` (panels) |
| `worker/` | The Worker: routing, auth, editor API, DraftStore, media, publish, MCP server |
| `mcp/` | Tools the Claude connector exposes |

Tests: unit tests next to the code (`*.test.ts`, Vitest), browser tests in `cms/tests/` (Playwright,
against `wrangler dev`).

## 4. Key ideas

- **Responsive model:** four breakpoints. Mobile is the base; tablet (600–899) and desktop (900+)
  inherit from mobile; widescreen (1600+) inherits from desktop. Only changed values are stored.
  Content (text, media, links) is never per-breakpoint; layout and style are. Mobile is the base in
  *storage*; the editor *presents* Desktop as the reference ("Editing Desktop", "Reset to desktop")
  and writes the base for you (see DECISIONS.md, the `setOnly` note).
- **One draft, many views:** the board shows the page once per breakpoint. The active frame is
  Puck's editable preview; the others are live read-only renders of the same draft.
- **Draft vs published:** edits go to the draft (DraftStore). Publish writes `content/` to GitHub.
  New deploys are merged into the draft so a stale draft can't undo them.
- **Nothing outside a frame is on the site:** board references are stored per page in the
  DraftStore (`refs:<pageId>`), never in content, never published.
- **Variants, staging and production** (`model/variants.ts`, `editor/workspace/staging.ts`):
  - A variant is a copy of a page to try ideas on: a page with `variantOf` (its page's id),
    `variantName` and `variantIds` (copied block id → the page's block id). It always stays a
    draft, so it is never built, listed or linked on the site. Make one from the page switcher
    ("New variant of …") or ⌘K. While one is on screen the frames turn purple and a band says
    which variant of which page it is, with Back and **Elect to staging**.
  - Electing puts the variant's content on its page (same id, address, title and nav place),
    gives copied blocks their original ids back (so section links keep working and only real
    edits count as changes) and removes the variant. Then the draft goes to staging.
  - **Staging** is a frozen copy of the draft in the DraftStore (`stg:f:`, `stg:b:`, `stg:meta`)
    with a share link, `/staging/<token>/…`, that anyone can open without signing in, rendered
    exactly like the site with a small "Staging preview" tag (noindex, not in robots). The token
    stays the same across updates; "Empty staging" turns the link off. The Publish sheet shows
    it: Copy link, Open, Empty staging, **Push to production**, and Send to/Update staging.
  - **Push to production** publishes exactly what is in staging (not the draft as it is now),
    through the same GitHub commit and rebuild as Publish, and refuses if the live site changed
    since it was staged (send it again first). Publish still publishes the draft directly.
  - Not yet: roles (anyone signed in can elect and push), compare with live before electing,
    version history and restore (ROADMAP).

## 5. How to work on it

```
cd cms
npm ci
npm test                 # unit tests
npm run build            # type check + editor + site
npx wrangler dev --port 8787 --var AUTH_MODE:password   # local editor at /admin
E2E_PORT=8787 npx playwright test                       # browser tests
```

- Branch per change, ideally in a worktree (`git worktree add -b <name> /tmp/aoost-<name> main`,
  then symlink `cms/node_modules`). Never commit `cms/node_modules` or `.dev.vars`.
- Every push to `main` deploys (the "Deploy CMS" workflow). Open a PR, merge with
  `gh pr merge --merge`, watch the run with `gh run watch`.
- Big pieces of work get a brief (`EDITOR-*.md`, `SITE-*.md` at the root) describing the goal,
  choices and checks, then are built and merged. The briefs are a good record of why things are
  the way they are.
- Screenshots in `docs/screenshots/` are regenerated by some browser tests; restore them
  (`git restore docs/screenshots`) unless the change is about them.
- Media for local dev lives only in the cloud R2 bucket, so images uploaded through the editor show
  as broken locally. That's expected.

**Test servers never publish.** `POST /api/editor/publish` answers 403 when the server signs in
with the password (`AUTH_MODE=password`, what every local/test server uses; production uses Access)
or runs on localhost, unless `ALLOW_LOCAL_PUBLISH=1` (a stress test once clicked Publish on a local server holding the real
GitHub token and changed the live homepage). Test copies of `.dev.vars` also leave out `GITHUB_TOKEN`.

## 5b. When something goes wrong: the problem log

The editor keeps a log of what goes wrong while people edit: script errors (editor and frames),
failed requests and saves (with status and message), the live connection dropping for more than
5 seconds, freezes over 400 ms (Chrome only reports these), and failed publishes. Each entry has
when, who (their login), what happened and where the editor was (page, screen size, zoom,
selection count, browser, OS, window size, build). People add their own notes with
**Report a problem…** in the top-right "…" menu (or ⌘K). The newest 400 entries are kept in
the DraftStore (`problems`), never in content.

**Flight recorder** (`editor/flight-recorder.ts`): the editor keeps a rolling record of the last
60 seconds (a report takes it at the moment the dialog opens): slow frames and frames per second, the board starting and stopping (with zoom),
every change to a toolbar (removed, hidden, faded, off screen), window and pixel-ratio changes,
and the GPU name. A report, a freeze note and an automatic "Toolbars vanished" note all carry
it. Reading it: if a toolbar changes in the record, the page really changed (a code bug); if
the record shows the toolbars steady while the person saw them flicker, the browser's drawing
dropped them (graphics). That is what Chrome does with the blurred "glass" panels: a real
report (Chrome 157, M1, 90% page zoom) held 60 fps with every toolbar steady in the page while
the screen flickered and the report dialog showed a smeared strip. So Chrome-based browsers
start with solid panels (`editor/display.ts`); Safari keeps the glass; **Glass toolbars** in
the "…" menu switches it either way, kept per browser.

**Still pictures on the board** (`board/stills.ts`, `board/FrameStill.tsx`): four live pages
scaled on every zoom step were the root of the board's flicker (dropped pieces, a page lagging its
frame by a step, thin lines shimmering). Each frame keeps a picture of its own live page (copied
from the frame: pieces placed, current edits, fonts and images embedded, drawn through an SVG onto a
canvas at design size). The board shows the picture for every frame while it moves and for frames
you aren't editing; the edited frame fades back to live ~0.2 s after it stops. A click on a picture
is forwarded to the page under it (same block gets picked). Pictures are retaken 1.2 s after edits,
frame loads or height changes, never while the board moves (one capture blocks ~0.1 s). The site's
own animations are paused in the board's frames (`stillMotion`); Preview and the site still move.
`scripts/probes/tiles.mjs` and `stills.mjs` measure it in real Chrome.

**Warm-up** (`editor/warmup.ts`): in idle time after opening, every character the panels use is
drawn once out of sight (one small piece per idle moment), so the first inspector doesn't pay for
the font lookup (~170 ms on Alex's Mac).

**Undo in fields** (`board/keys.ts`): ⌘Z / ⇧⌘Z in a page field (inspector, panels, text typed in
a frame) is the editor's undo; the field is left first so it shows the undone value. Search boxes
keep the browser's own undo. `PuckSync` skips the echo of a canvas edit only once (redo brings that
same page object back and must reach the canvas).

**Measuring** (`cms/scripts/probes/`, see its README): `audit.mjs` (every flow, Event Timing input→paint, LoAF with source,
errors, screenshots; never clicks Publish), `trace-click.mjs` (Chrome trace of one action, broken
down), `profile.mjs` (CPU profile mapped to source; build with `SOURCEMAP=1`), `undo.mjs`.

**Board layer hint**: `.bd-world` gets `will-change: transform` only while the board moves
(`is-moving` / `is-interacting`). Left on, Chrome kept the pages at the detail they were first
drawn at; after zooming in then out, four long pages overran the graphics memory and pieces of the
previews dropped out even with the board still (`scripts/probes/tiles.mjs`: 277 of 294 frames bad on
Alex's M1, 0 after).

**Pinch guard** (`editor/pinch-guard.ts`): a trackpad pinch reaches Chrome as ctrl + wheel and
Safari as gesture events, and the browser zooms the whole page unless the page cancels them.
The board only cancelled pinches on itself, so a pinch over the toolbars, rail, panels, zoom bar
or a dialog zoomed the page and pushed the toolbars out of sight ("toolbars disappeared"). The
guard cancels every pinch on the editor window and each frame (without stopping it, so the board
still zooms), except while the browser's own zoom is already on: then a pinch goes to the
browser, so pinching out undoes it. If the page is zoomed anyway, `BrowserZoomNotice` says to pinch out, and the
recorder and report context log the browser's pinch zoom.

**Start-up guard**: an inline script in `index.html` reloads once (and notes it) if a build file
fails to load or nothing draws in 15 s, then offers a Reload button; `editor/load-guard.ts` does
the same for on-demand parts and for an editor drawn without its toolbars. The service worker
serves the editor page network-first (cache only when offline, never just because the network is slow), so a refresh after
a deploy always gets the new build; build files are kept across one deploy in
`aoost-editor-assets`.

Read it:
- In the editor: "…" menu or ⌘K → **Problem log** (Copy all for a message or a chat with Claude; Clear).
- As text: `GET /api/editor/problems?format=text&limit=100` (signed in).
- Through the Claude connector: the `get_problem_log` tool (optionally `kind`: error, request,
  connection, stall, publish, report).

When Alex says "something went wrong", read the problem log first.



- GitHub repo: `atomdev24/aoost` (Alex's personal account).
- Cloudflare: Worker `aoost-cms`, R2 `aoost-media`, Access policy for the editor.
- Secrets: Worker secrets (GitHub token for publishing, Access settings) and `.dev.vars` locally.
  Never commit or print them.
- To let another person or Claude account work on it: give their GitHub account access to the repo,
  and add their email to the Cloudflare Access policy for editor access.

## 7. Making a second site (Aerobotics)

The engine is reusable; the aoost-specific parts are the `components/aoost/` pack, the theme in
`content/site.json`, a few hard-coded names (Alex, aoost, the repo, the domain) and the Worker and
R2 names in `cms/wrangler.jsonc`. The plan (see `ROADMAP.md`):

1. Move hard-coded names into a site config.
2. Keep generic blocks in `components/`, site packs in `components/<site>/`.
3. A second site = its own content folder, pack, theme, Worker, R2 bucket and Access policy,
   deployed from the same engine. Split into its own repo when it needs to live separately.

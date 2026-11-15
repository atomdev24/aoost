# Decisions

One line each: the decision, and why. Newest at the bottom.

- Everything for the CMS lives in `cms/` (its own `package.json`); content lives in `content/` at the repo root. Why: keeps the GitHub Pages site files untouched until cut-over.
- `wrangler.toml` lives in `cms/`; `npm run dev` symlinks the root `.dev.vars` into `cms/` (both gitignored). Why: wrangler only reads `.dev.vars` beside its config, and Alex's file is at the root.
- The admin SPA is a plain Vite build served at `/admin/` from Worker static assets (no Cloudflare Vite plugin). Why: fewer moving parts; `wrangler dev` serves the built files.
- `assets/fonts/FacileSans-Regular.otf` is committed so the deploy Action can build with it. Its note says "Freeware, Non-Commercial"; see `BLOCKERS.md` for the licence check.
- Content files: `content/site.json` (settings, theme, nav, globals, templates, redirects, page order), `content/collections.json`, and one `content/pages/<id>.json` per page. Why: readable git diffs and per-page history.
- Diary entries and playlists are collections (`content/collections.json`), rendered by the Diary list and Playlist card components, not one page each. Why: the site is a diary feed; it makes quick-edit "add an entry/playlist" a one-form action and keeps page nesting one level deep.
- "Show in navigation" is a `showInNav` flag on the page. A page-link nav item whose page has visible sub-pages renders as an automatic dropdown (matches the mockup's caret behaviour).
- Colours in content can be `token:<name>`; they render as CSS variables, so editing a theme token restyles the whole site without touching pages.
- Canvas sections store layer boxes in design px (390 mobile, 1440 desktop) and render as percentages of an aspect-locked artboard, so they scale with no layout JS.
- Seed images reference the existing `/art/*` files (copied into the build output, originals untouched). Socials are generic instagram.com / spotify.com links until Alex sets his profiles in Site settings.
- The Rodeo page links to the current site's game; migrating the game itself is out of this run (SPEC §10).
- Desktop breakpoint starts at 900px (`DESKTOP_MIN`). Why: below that the pill nav's link row and multi-column grids get cramped; tablets in portrait get the mobile layout until a tablet breakpoint exists.
- A canvas layer with no desktop position is derived by scaling the mobile artboard uniformly to fit a band at most 720px tall, centred in 1440px. Why: literal width scaling (×3.7) makes sections absurdly tall.
- Text sizes are emitted as `calc(var(--cs, 1px) * N)`: inside a canvas `--cs` is one design px, so type scales with the artboard; elsewhere it is 1px.
- Components keep their CSS in a `*.styles.ts` string, not a `.css` file. Why: the same component code runs under Vite (editor), tsx (build) and the Worker (draft preview), and a TS string is the one format all three import without loader config.
- Pages are written as `work.html` / `work/digital.html` so Cloudflare serves clean URLs (`/work`). All CSS is inlined per page (only the components that page uses) and there is one deferred script (`/assets/site.js`, ~8 KB).
- Text content supports only `**bold**`, `*italic*`, `[links](url)` and line breaks, rendered as React nodes. Why: no raw HTML in text means nothing to sanitise; the Code block is the place for custom HTML.
- A page link with sub-pages uses a split control in the pill: the label navigates, the caret button opens the menu (works for hover, tap and keyboard).
- The draft lives in a SQLite-backed Durable Object (free plan) as the same files as `content/`; changes travel as page-granular ops (last write wins per page). Why: publishing becomes "commit these files", and live sync stays simple.
- The editor uses Puck's own layout (plugin rail, canvas zoom, fields) re-themed dark, with our top bar and panels plugged in, instead of a hand-built layout. Why: Puck's drag and overlay maths depend on its own canvas zoom.
- The editor keeps its own undo stack at site level (it must also hold page, nav, theme and Claude edits); Puck is a view of the current page.
- Free canvas: Puck keeps selection, but dragging/resizing layers is our own pointer controller inside the preview iframe (Puck's list drag is switched off for canvas layers). Moves commit to the editor store as one undo step. Resize ignores a layer's rotation (handles act on the unrotated box).
- Puck selects one item, so multi-select exists only on a canvas (Shift-click). Align works on one layer (to the artboard) or several (to each other); distribute needs three or more.
- Grid "drop zones" are shown as column guides in the editor; cells auto-flow and each cell can span columns/rows. "Split into 1/2/3/4/6" sets the column count for the active breakpoint.
- Overlays live on the page (`page.overlays`), outside Puck's tree: they are added from the Layers panel, drawn on the canvas, and edited in their own right-hand panel. An overlay attached to a section sits centred on that section's top or bottom edge (straddling it) and can be nudged; attached to the screen it is `position: fixed`.
- Hide is per breakpoint (it writes `hidden` at the active breakpoint); lock and rename are shared.
- Publish commits to the branch in `PUBLISH_BRANCH` (set to `cms-v1` for this run, never `main`). Change that one var at cut-over. The ref update is not forced, so a publish can never overwrite someone else's commit.
- After a publish the draft store keeps a snapshot of what it published, so "Unpublished changes" clears right away instead of waiting for the deploy.
- Undo/redo is the editor's own site-level stack (100 steps, edits to the same field within 1.2 s merge into one step). ⌘Z/⇧⌘Z are captured before Puck's own history.
- New pages start as Draft (Alex publishes them from Page settings), even though the mockup's sample data shows Published. Why: a half-built page should not go live with the next Publish.
- Changing a URL keeps every earlier redirect pointing at the newest URL, and a redirect is dropped the moment a live page takes that URL again. Deleting a page redirects its URL (and its sub-pages') to home.
- A page with sub-pages cannot itself be nested (one level deep, SPEC §5); "Place it" only offers top-level parents.

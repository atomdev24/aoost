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

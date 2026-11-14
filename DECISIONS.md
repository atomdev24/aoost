# Decisions

One line each: the decision, and why. Newest at the bottom.

- Everything for the CMS lives in `cms/` (its own `package.json`); content lives in `content/` at the repo root. Why: keeps the GitHub Pages site files untouched until cut-over.
- `wrangler.toml` lives in `cms/`; `npm run dev` symlinks the root `.dev.vars` into `cms/` (both gitignored). Why: wrangler only reads `.dev.vars` beside its config, and Alex's file is at the root.
- The admin SPA is a plain Vite build served at `/admin/` from Worker static assets (no Cloudflare Vite plugin). Why: fewer moving parts; `wrangler dev` serves the built files.
- `assets/fonts/FacileSans-Regular.otf` is committed so the deploy Action can build with it. Its note says "Freeware, Non-Commercial"; see `BLOCKERS.md` for the licence check.

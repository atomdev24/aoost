# aoost CMS: build plan

Tick items as they're done (`- [x]`) and commit after each one. If the run stops, the next run starts at the first unticked item. Spec: `SPEC.md`. Rules: `CLAUDE.md`.

## Phase 0: Alex, before the run (human-only)

- [ ] Clone `atomdev24/aoost` on the Mac. Node 20+ installed (`node -v`).
- [x] `npx wrangler login` (done 14 Nov). On this Mac, run npm/npx with `npm_config_cache=/tmp/aoost-npm-cache`: the default npm cache has a permissions problem.
- [x] Cloudflare dashboard: create R2 bucket `aoost-media` (done 14 Nov).
- [ ] Choose an editor password and put it in `.dev.vars` as `EDITOR_PASSWORD`. Until Cloudflare Access is set up, the editor, `/api/editor` and `/mcp` are protected by this password (an HTTP-only session cookie for the editor, a bearer token for `/mcp`).
- [ ] AFTER the run (Alex with Claude): Cloudflare Zero Trust Access application on the editor's URL for Alex's email only, plus a service token for the Claude connector. Then switch auth from the password to Access. The run must build auth so this switch is a config change.
- [ ] GitHub: a fine-grained token with Contents read/write on `atomdev24/aoost` only, saved as `GITHUB_TOKEN` in `.dev.vars`. Also add a `CLOUDFLARE_API_TOKEN` repo secret for the deploy Action.
- [ ] Put the Facile Sans web font files in `assets/fonts/` and confirm the licence allows web use. Optional: drop artwork images and line-art SVGs into `assets/seed/`.
- [ ] Claude Code: set the model to Fable. Use a permission mode that allows file edits and terminal commands without prompts, with this repo as the working folder. Keep the Mac awake and plugged in.
- [ ] Start the run with: "Read CLAUDE.md, SPEC.md and PLAN.md, then work through PLAN.md from the first unticked item."

## Phase 1: Foundation

- [x] Branch `cms-v1`. Scaffold Vite, React and TypeScript in `cms/`, leaving the existing site files untouched.
- [x] Worker with static assets, plus `wrangler.toml` (R2 binding, Durable Object binding, vars). `wrangler dev` serves a hello page.
- [x] Content schema in TypeScript with zod validation (SPEC §3), plus a seed `content/` with Home, Work (with Digital and Physical), Diary, Playlists, Rodeo, About and Links (hidden).
- [x] Responsive resolver: merge mobile base with desktop overrides, then generate CSS with media queries. Unit tests.
- [x] Static renderer: content JSON to HTML/CSS per page, with redirects output. Build script. Tests.

## Phase 2: Editor core

- [x] Puck at `/admin` with our config. Load and save the draft through `/api/editor`.
- [x] Desktop/Mobile switch. Edits go to the active breakpoint, with override dots and "reset to mobile".
- [x] Section kinds: flow, grid (split N with drop zones) and canvas (absolute layers per breakpoint, snapping, guides, Shift axis lock, align/distribute).
- [x] Frame node: frame size and aspect ratio, per-corner radius, border, shadow, plus content fit, focal point, zoom and pan.
- [x] Overlays (anchored to a section or the viewport, sticky). Layers panel (lock, hide, rename, reorder).
- [x] Theme panel: tokens, text styles and colour styles applied site-wide.
- [x] Global components. Section and page templates, including the four starters.
- [x] Undo/redo, autosave, Preview, Publish (commit through the GitHub API, then the Action deploys).

## Phase 3: Pages & navigation

- [x] Pages panel matching the Editor artboard: new page flow, nesting, and the nav toggle per page.
- [x] Page settings: rename, slug edit with automatic redirect and child updates, status, SEO, duplicate, delete with confirmation.
- [x] Floating pill nav renderer (SPEC §6): hide on scroll down and show on scroll up, active pill, hover/press states, the mobile full-screen menu with stagger, and reduced motion.
- [x] All ten nav item types and the item settings panel. Mega menu panels built in the editor. Accessible menu-button behaviour. Accordions on mobile.

## Phase 4: Media & embeds

- [x] R2 upload from the editor (drag and drop, plus a media library). Resizing to WebP/AVIF on delivery.
- [x] Image, Video, Audio, Spotify/YouTube/SoundCloud/Instagram/Maps embeds, Lottie, 3D `.glb`, File download.
- [x] Code block: sandboxed iframe (default, auto height) or inline (opt-in with a warning).
- [x] Font upload plus the Google Fonts picker. Facile Sans wired in if the files are there.

## Phase 5: Claude connector & live sync

- [x] Durable Object draft store with WebSocket broadcast. Fall back to KV plus polling if needed (log it in `DECISIONS.md`).
- [x] Editor applies remote patches live, highlights the changed nodes, and adds them to undo as "Claude: …". Publishes the current selection and breakpoint.
- [x] `/mcp` remote MCP server with the SPEC §8 tools, behind Access. `publish` is gated by its tool description.
- [x] `get_preview_screenshot` (Browser Rendering, or capture from the editor client).
- [x] Write `docs/connect-claude.md`.

## Phase 6: Quick-edit mode & checks

- [x] Editor on small screens: quick-edit mode (text, swap image, add a diary entry or playlist, publish).
- [ ] Build a sample page with every section kind, media type and nav feature. Playwright screenshots at 390 and 1440 into `docs/screenshots/`.
- [ ] Tests green, Lighthouse mobile ≥ 90 on the sample page, README written.
- [ ] Open a PR from `cms-v1` to `main` with a summary, screenshots, `DECISIONS.md` and `BLOCKERS.md`. Do not merge.

# Handover (26 Nov 2026)

For the next Claude picking this up (e.g. Alex's organisation account). Read this, then
`CLAUDE.md` (rules), `HANDBOOK.md` (how it's built and run), `ROADMAP.md` (order of work),
`DECISIONS.md` (one line per choice). Each feature has a brief at the root (`EDITOR-*.md`).

## Who and how
- **Alex** (marketing at Aerobotics, not technical). Plain words, no jargon. The editor is his art
  site's CMS (alexoostendurp.com) and will become the Aerobotics website editor.
- **Merging:** Alex said you don't need to ask to merge. Pushing to `main` deploys. Still ask
  before publishing site *content* (the editor's Publish), and never touch DNS, Supabase, paid
  services, new accounts or secrets (see CLAUDE.md hard limits).
- **Visual choices:** always show mockups to choose from (Design canvas artifact), never text only.
- **Flow per change:** branch → tests + `npm run build` (bundle budget) → browser check at 1440 and
  390 → brief/DECISIONS/ROADMAP lines → PR → squash-merge → check the deploy run.

## Commands
```
cd cms
npm run -s build:site && npm run -s build          # site + editor; check-bundle enforces scripts/bundle-budget.json
npx vitest run                                     # 648 tests
npx tsc --noEmit -p .
npx wrangler dev --port 8790 --var AUTH_MODE:password --var EDITOR_PASSWORD:localtest --test-scheduled
curl -X POST localhost:8790/demo/api/editor/demo/reset   # fresh demo
# admin locally: POST /api/login {"password":"localtest"}; demo at /demo/ (no login)
```
Restart wrangler after each build. Playwright uses `/usr/bin/google-chrome`.
Speed probes: `cms/scripts/probes/perf.mjs [mobile]` (editor: load, tap and key latency) and
`site.mjs` (public pages on a slow phone). Baseline and results: `EDITOR-FOUNDATIONS.md`.

## Gotchas learnt the hard way
- **Bundle:** `vite.config.ts` puts every `src/` file in the first-load "editor" chunk unless its
  path is in the `LATER` regex. A new lazy part (`lazy(() => import(...))`) must be added there too,
  or it silently loads up front. Raise the budget only on purpose.
- **Durable Object RPC:** `draft.kvGet<T>(k)` doesn't type-check in the Worker; write
  `(await draft.kvGet(k)) as T | null`.
- **Portals:** modals portalled to `document.body` lose `.ed-panel *` box-sizing; `.ed-modal *`
  now sets it. Frosted ancestors break `position: fixed`: portal floating bars to body.
- **Canvas is an iframe:** React handlers inside it can be pre-empted by the canvas's native
  capture listeners (`CanvasController`, `side-drop`): they skip `[data-rich-editing]`. Keyboard
  shortcuts (`board/keys.ts`) skip everything but Save while editing text in place.
- **Tests that import the store** crash in vitest (window); keep pure logic in its own file.
- **Clarity API:** 10 requests/day, last 1–3 days only, only Traffic fields documented.

## Done this session (PRs #125–#133)
- Campaign pages from a brief (+ @Claude polish comment). `EDITOR-CAMPAIGN-BRIEF.md`
- **Rich text:** double-click text (or Enter, or "Edit text" on the selection) to edit in place
  with Tiptap; Style → Text per screen size. `text` stays the words, `rich` only when needed and
  drawn only while it matches. `EDITOR-TEXT.md`
- **Visitor insights (Microsoft Clarity):** tag + cookie notice on published pages, daily fetch
  (03:00 Cape Town cron) kept 120 days, ⋯ → Visitor insights (demo shows the real numbers
  read-only). Live since Alex's publish (project `zju5sls37v`, secret `CLARITY_API_TOKEN` set).
  `EDITOR-INSIGHTS.md`
- **Audit + directions:** Design canvas "aoost editor: UI audit and directions"
  (https://claude.ai/artifact/GWAHqyD964xBJPTDEsRnSH). Alex picked **A** (calm workspace) as the
  base, **B's Simple mode** for teammates, **Phone 1** (bottom tabs).
- **Layout stages 1–6** (`EDITOR-LAYOUT.md`): one status pill; labelled rail + Site menu; actions
  above the selection (Edit text / Replace, Settings toggles the side panel); Simple / Full switch
  (Owners Full, others Simple, remembered per person); phone bottom tabs and sheets; blocks redraw
  only when what they draw from changes (phone tap 150 → 48 ms).

## Next, in order
1. **Speed, part 2:** side frames (LiveFrame) catch up after an edit rather than during it;
   lighter first load (1.9 MB before the board; show a still of the page first, load Puck behind).
2. **Homepage on phones:** 5.2 s to the main picture, 1.8 MB (artwork images and effects).
   Smaller images, start effects after first paint. It's Alex's art homepage: keep the look.
3. **Audit leftovers** (canvas board "Audit"): developer words in fields (raw URL, rgba tint),
   pictures not file names in lists, quieter Layers rows. ("25 changes for phones" done, PR #135.)
4. **Rich text for the Aerobotics blocks' text fields**; inline font size.
5. **Web app extras:** share a photo from the phone into Media (Web Share Target), push
   notifications for mentions and Claude replies.
6. From the research roadmap: A/B tests from variants; brand guardrails beyond Simple mode;
   engine / site-pack split for the Aerobotics site; AI attention preview (parked by Alex).

## Open with Alex
- Nothing blocking. BLOCKERS.md has older optional dashboard steps (Cloudflare Access for `/mcp`,
  connector setup, sign-in duration).
- Alex said "we will come back to" dragging an image so text adjusts around it (side-by-side
  text works; free wrapping does not).
- C (command bar first) from the mockups wasn't picked; the ⌘K palette exists already.

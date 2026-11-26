# Roadmap

Agreed with Alex on 19 Nov 2026 after an end-to-end review of the editor (full notes in the
"aoost editor review" doc). Decisions here are settled; build to them.

## Decisions

### Teams and versions

| Topic | Decision |
| --- | --- |
| Roles | Owner, Manager, Editor, Viewer. Owners and managers promote and publish; editors edit and comment; viewers comment only |
| Versions | Per page first ("New version" copies a page into a named version beside it). Whole-site branches later, for redesigns |
| Promote conflicts | If the live page changed since the version was started, show a side-by-side compare, then confirm |
| Comments | In the editor only for now (pinned to a block or a spot on the board, threaded, resolvable). A public review link later |
| Notifications | Email and Slack, each switchable in a new settings page. Email on mention or reply (doubles as a record). Slack is built but off until the Aerobotics CTO approves the app |

### Creative workspace

| Topic | Decision |
| --- | --- |
| Reference boards | Per page (live), plus a shared site-wide "scrapbook" board later |
| Layering | References sit **on top** of frames, newest on top (change from the first version, which put them behind) |
| Image tools | Go as far as masks and colour: crop, rotate, flip, opacity first, then masks and colour adjustments |
| Reference types | Images now, then video clips and link cards |

### Tests

- Retire the "CMS homepage looks like the original" pixel test (it compares against the old
  mmm.page homepage, which the site has moved past).

## Order of work

1. ~~Inspector and phone polish~~ ✓ built (`EDITOR-INSPECTOR-PHONE.md`, PR open; Alex's Samsung A55
   screenshots still to come).
2. Long-page smoothness: show a snapshot of side frames while panning or zoomed out
   (currently 0.5–1 s stalls at 45–90 sections).
3. References: on top of frames; drag into a frame to place it on the page and back out; notes,
   labels, shapes and arrows on the board; crop, rotate, flip, opacity.
4. Versions with promote and compare; roles (owner, manager, editor, viewer).
5. Teammates: presence (cursors and names), comments with threads and resolve, notifications
   (email, Slack provision) and a settings page.
6. Masks and colour adjustments for board images; video and link references; shared scrapbook board.
7. Engine / site-pack split for the Aerobotics website (see HANDBOOK.md §7). Started: the Aerobotics block pack (`components/aerobotics/`) is in the demo's Brand tab.
8. Collections (`EDITOR-COLLECTIONS.md`): ✓ built on `feat/collections` (PR open, waiting on Alex's review).
   Next: the "not yet" list in that brief.

## Done (26 Nov 2026): editor UI spec for the Aerobotics team

From the interview with Alex (doc "Editor UI spec — Aerobotics team"), shipped in PRs #95–#101:
layers as a Figma-style tree (drag to reorder, top layer first); pages as cards with Campaigns and
Blog folders; insert tabs (Basics, Brand, Motion, More); inspector tabs (Content, Style, Layout)
with help; hover name tags; undo messages; history grouped by day; image name tags; orange marks
for phone-only changes; the editing frame measured and fixed to match the live page; a
draft-vs-live chip; campaign pages (link only, end dates) with a HubSpot form block; blog posts
with a doc-like writer and a blog list; English/Spanish linked translations (copies for
campaigns); roles with a Team panel and @mention suggestions. Waiting on Alex: BLOCKERS.md
"Team roles and Google sign-in".

## Done (21 Nov 2026)

- Placing project pieces: drag a piece in the editor to set where it sits on that screen size
  (double-click to go back to automatic); saved like sizes, honoured by the site. Also fixed
  resized pieces bunching top-left and trailing the pointer.

- Hero fixes: parallax moves the artwork inside its frame and no longer cancels the enter
  slide; switches for the progress line and for opening artwork full screen (hero and projects
  table); dot board finer and smoother, sentence case, with an opening wave.

- Dot board: a second strip style for the hero. Each line appears as square dots that grow in
  with a sweep, breathe while held and shrink away; long lines split into even frames. The
  scrolling ticker stays the default; switch with Hero → Strip style. Also fixed the editor's
  frame pictures pairing images wrongly after a canvas.

- Projects table: the editor's frames lay the pieces out exactly as the site does (it showed a
  plain grid), and pieces never sit on top of each other: they are placed clear, and a piece put
  down on another pushes it out of the way.

- Faster opening, phases 0 and 1: opening marks and `open.mjs`; a size budget that fails the
  build; panels, sheets and dialogs load after the board (idle and hover prefetch, retry); the
  draft is fetched alongside the script. Locally: board usable cold 1010 → 816 ms, warm 423 → 319 ms.

- Compare: a variant or a past version side by side with the live page (Desktop or Mobile,
  scrolling together) with the list of changes, and Elect or Restore from there.

- Version history: a History panel lists every publish and push (who and when), previews any
  version as it was, and restores one into the draft and staging (never straight live).

- Variants, staging and Push to production (for Monday's demo; plan in the "aoost editor: faster
  opening plan and Figma gap list" doc, Roadmap tab): make a variant of any page from the page
  switcher, edit it while the page stays as it was (purple frames, a band with Back and Elect),
  elect it into staging, share the staging link (opens without signing in, "Staging preview"
  tag), then Push to production publishes exactly what was staged. Decided with Alex: electing
  goes to staging, never straight live; Owners and Managers will elect once roles exist; access
  (Google sign-in) and the Aerobotics split come after the editor's functionality.

- Stress test and polish pass (`.probe/audit.mjs`: every main flow in real Chrome, input-to-paint
  times, long frames with source, errors, screenshots; desktop and phone):
  - Still pictures cost far less: images copied at the size shown, Latin fonts only, no file
    encoding (that step alone froze the editor 1.2 s), and no retake when nothing changed. Worst
    capture freeze ~0.1 s (was 1.2 s). They also feed the loading pictures; the old capture is gone.
  - First selection no longer freezes (~170 ms → ~20 ms): the panels' symbols are drawn once,
    out of sight, in idle time after opening (the first lookup of fonts for them was the cost).
  - Linked selection marks the selected block instead of rewriting a style sheet in every frame.
  - Undo/redo from a field: ⌘Z in the inspector/panels is the editor's undo (a second ⌘Z used to
    put the typing back), and redo reaches the canvas with the block still selected (it didn't).
  - Phone: the page list opened under the wrapped tools row (Home and Work unreachable).
  - Loading pictures show at full strength (sharp now); "Loading latest…" only after 0.4 s.
  - Report box has room for a few lines.
  - Test servers never publish (password sign-in or localhost answer 403): a stress-test run
    published a test heading to the live homepage for ~14 minutes before it was restored (PR #32).
- Still pictures on the board: frames you aren't editing, and every frame while zooming or
  panning, show a sharp picture of their page instead of the live page; the edited frame fades
  back to live when the board stops. Site animations are paused on the board. On Alex's M1 (all
  four frames, 90% page zoom): no dropped pieces, same smoothness. Trade-off: edits reach the other
  frames ~1–2 s later. The editor page is now only served from the offline cache when offline.
- Blank and black blocks in the page previews (even with the board still): the board kept a
  "will move" hint all the time, so Chrome held the pages at full detail after zooming out and ran
  out of graphics memory. The hint is now only on while the board moves (probe: 277/294 bad
  frames before, 0 after, same smoothness).
- Chrome flicker: a flight-recorder report showed 60 fps and every toolbar steady in the page
  while the screen flickered, so the cause is Chrome drawing the blurred glass panels. Chrome,
  Edge, Brave and Arc now start with solid panels; Safari keeps the glass; the "…" menu
  switches it.
- Toolbars disappearing: a pinch over a toolbar, the rail, a panel, the zoom bar or a dialog
  zoomed Chrome's whole page (found at 173% in Alex's tab) instead of the board. Every pinch now
  zooms the board; if the page is zoomed anyway, a notice says to pinch out.

## Done (20 Nov 2026)

- Toolbars missing after a refresh: the service worker served the editor page from its cache
  first, so the first refresh after a deploy loaded the old build, whose files the server no
  longer has. The page is now network-first, build files survive one deploy, and a start-up
  guard reloads once (then shows Reload) if anything fails to load.
- Diagnostics: a 15-second flight recorder attached to reports, freezes and an automatic
  "Toolbars vanished" note; Report a problem and Problem log in the "…" menu; a Glass toolbars
  switch for graphics setups that flicker (Chrome at a page zoom other than 100% draws at a
  fractional pixel ratio).
- Zoom flicker: the page frames no longer restyle on every zoom step (the outline-width setting
  waits until the zoom settles), which made pages flicker, especially in Safari. WebKit zoom went
  from about 16 to 55 frames a second. The frosted glass no longer swaps to a solid tint while
  moving.
- Movable panel bar: drag the left rail by its grip anywhere on the canvas; its panels open on the
  side with room; remembered; double-click the grip (or snap to the left edge) to put it back.
- Problem log and Report a problem (HANDBOOK §5b), readable in the editor, as text and by Claude.
- Done (Nov 2026): connect a personal Claude account by OAuth (`docs/connect-claude.md`), Claude-at-work pill, ring and tag, @Claude comment tasks. Needs the Access path change in BLOCKERS.md.

## Done (19 Nov 2026)

- Inspector and phone polish: content first in the inspector (sections: Background first), one
  size switch (top bar only), the block name on its own line, the opening view leaves room for
  panels, short frame labels below 35% zoom, sums in number fields (`48*2`, `+8`); the phone sheet
  opens short on Content and steps aside for left panels; no shortcuts sheet on touch.
- Toolbars and labels no longer flicker or vanish while panning/zooming (own GPU layers; blur
  drops to a solid tint while moving); side frames no longer blank when panned back into view.
- Board references (per page, never published); Fit includes them and leaves room for open panels.

- Done (Nov 2026): Releases with a schedule (research item 1): Publish ▾ → Schedule…, a release chip with Cancel and Undo, a 15-minute cron on the server (EDITOR-RELEASES.md). 
- Done (Nov 2026): Pre-flight checks (research item 2), left of Preview (EDITOR-CHECKS.md). Next from the research: campaign pages from a brief, by Claude.

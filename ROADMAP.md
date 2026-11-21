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
7. Engine / site-pack split for the Aerobotics website (see HANDBOOK.md §7).

## Done (21 Nov 2026)

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

## Done (19 Nov 2026)

- Inspector and phone polish: content first in the inspector (sections: Background first), one
  size switch (top bar only), the block name on its own line, the opening view leaves room for
  panels, short frame labels below 35% zoom, sums in number fields (`48*2`, `+8`); the phone sheet
  opens short on Content and steps aside for left panels; no shortcuts sheet on touch.
- Toolbars and labels no longer flicker or vanish while panning/zooming (own GPU layers; blur
  drops to a solid tint while moving); side frames no longer blank when panned back into view.
- Board references (per page, never published); Fit includes them and leaves room for open panels.

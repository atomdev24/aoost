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

1. Inspector and phone polish: content first in the inspector, one breakpoint switch (top bar
   only), title on its own line, opening view leaves room for panels, short frame labels when
   zoomed out, maths in number fields; phone sheet opens short on Content and closes when a left
   panel opens; no shortcuts sheet on touch.
2. Long-page smoothness: show a snapshot of side frames while panning or zoomed out
   (currently 0.5–1 s stalls at 45–90 sections).
3. References: on top of frames; drag into a frame to place it on the page and back out; notes,
   labels, shapes and arrows on the board; crop, rotate, flip, opacity.
4. Versions with promote and compare; roles (owner, manager, editor, viewer).
5. Teammates: presence (cursors and names), comments with threads and resolve, notifications
   (email, Slack provision) and a settings page.
6. Masks and colour adjustments for board images; video and link references; shared scrapbook board.
7. Engine / site-pack split for the Aerobotics website (see HANDBOOK.md §7).

## Done (19 Nov 2026)

- Toolbars and labels no longer flicker or vanish while panning/zooming (own GPU layers; blur
  drops to a solid tint while moving); side frames no longer blank when panned back into view.
- Board references (per page, never published); Fit includes them and leaves room for open panels.

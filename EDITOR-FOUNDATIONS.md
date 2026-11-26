# Foundations (26 Nov 2026)

Alex's call: before more features, the basics people touch all day. This is the baseline, the
audit and the plan. Mockups: "aoost editor: UI audit and directions" (Design canvas in Claude).

## Speed baseline (local build, Chrome)

| | Desktop | Phone (4× slower CPU) |
|---|---|---|
| Ready to edit (canvas drawn) | 1.1 s | 1.8 s |
| Click / tap to next paint, typical | 24 ms | 150 ms |
| Key press while typing, typical | 16 ms | 80 ms |
| Longest frame | 0.46 s | 0.71 s |
| First-load script | 1.9 MB (560 KB sent) | same |

Public site on a slow phone (150 ms, 1.6 Mbps, 4× CPU): `/work`, `/journal` draw in under 0.8 s
with 80 KB; the homepage takes 5.2 s to its main picture, 1.8 MB, 3.6 s blocked (artwork images
and effects). Targets: under 100 ms per interaction (Linear's bar); Google calls 200 ms good.

After "redraw only what changed" (26 Nov): phone tap 48 ms, key 72 ms.

Scripts: `/home/claude/perf/*.mjs` style Playwright runs (event timing, long animation frames,
largest paint). Re-run after each foundation to show the change.

## Sync engine: not yet
The editor already syncs small edits live (one Durable Object per draft, websocket to every open
editor), so changes don't wait on a server round trip for the person making them. The slowness is
redrawing: each change redraws the whole frame. Fix that first (redraw only the block that
changed; let side frames catch up). A full local-first engine (Linear-style) only if collaboration
needs it.

## Web app
The editor is already an installable app (manifest, service worker, own window, home-screen icon).
Worth adding, in order: share a photo from the phone straight into Media (Web Share Target), push
notifications for @mentions and Claude's replies, a quick-edit view for phones. Offline editing:
not worth it yet (conflicts with live sync for little gain).

## Audit (13 items, details on the canvas)
Speed: phone lag per tap/key; heavy first load; a false "didn't finish loading" warning (seen at
5.5 s locally, check on a real device); slow homepage on phones.
Clarity: six signals in the top bar; ten unlabelled rail icons; two counters side by side; tips and
the demo strip over the page.
Side panel and phone: developer words and raw URL/rgba fields; file names instead of pictures;
repeats in Layers; tools take a third of a phone screen; "25 overrides" reads as an error.

## Directions to choose from (mockups)
A · Calm workspace: one status, five labelled panels plus Site, an action bar above the selection,
settings on request. B · Content first: the page as a list of sections, plain fields, a Simple /
Full switch (brand colours only in Simple). C · Command bar first: almost no chrome, one bar that
finds and runs anything (and asks Claude). Phone 1 · bottom tabs with half sheets; Phone 2 ·
floating dock that turns into the block's actions. Likely mix: A as the base, B for teammates,
C's bar for speed.

## Done in this round
1. Rich text (EDITOR-TEXT.md). 4. Visitor insights with Clarity (EDITOR-INSIGHTS.md).
Parked: AI attention preview (kept on the roadmap).

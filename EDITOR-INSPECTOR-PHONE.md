# Task: inspector and phone polish

Item 1 of `ROADMAP.md`, agreed with Alex on 19 Nov 2026 after the editor review. Work on branch
`editor-inspector-phone` in a worktree (`/tmp/aoost-inspector-phone`) from `main`. Commit after
each step. Open a PR and stop; Alex merges. Follow `CLAUDE.md`.

The goal: the inspector reads well for teammates who aren't designers. What a block *says* comes
first, layout controls come after, and there is one obvious place to pick the screen size. On a
phone the editor gets out of the way.

## 1. Content first in the inspector

Today a block's inspector runs Layout, Frame, Content, Motion, Visible on
(`editor/puck/config.tsx`). New order:

1. **Content** (text, image, link: shared across sizes)
2. **Layout** (position, size, spacing: per size)
3. **Frame** (crop and fit, look: per size)
4. **Motion**, **Visible on**, **Layer name**

- Blocks with no content fields start at Layout, as now.
- Sections keep their own order (`editor/puck/sections.tsx`), but anything that is content (a
  title, a background image) moves to the top there too.
- Group headings stay plain words. No new jargon.

## 2. One screen-size switch (top bar only)

- Remove `BreakpointSwitch` from the inspector header. The top bar's size buttons are the only
  switch. Clicking a frame's label on the board still picks that size, as it does now.
- The scope bar under the title still says "Editing Desktop" / "Editing Mobile · 2 changes" with
  "Reset all", so you always see which size you're changing.
- On a phone (no top-bar switch visible), the scope bar's size name becomes a small menu to pick
  the size, so the phone isn't left without one.

## 3. Title on its own line

- With the switch gone, the inspector header is the block name on one line and its type
  ("Image · on Home") under it. Long names wrap to two lines at most, then end in "…" with the
  full name on hover.

## 4. The opening view leaves room for panels

- The first time a page opens (no saved view), "Fit all" runs once the left panel and the
  inspector have been measured, so no frame starts hidden under them. Today the first fit can run
  before the flyout is on screen.
- Reserve the inspector's width on the right even when nothing is selected yet, so selecting a
  block doesn't cover the frame you were looking at.
- Saved views are left alone.

## 5. Short frame labels when zoomed out

- Below about 35% zoom, frame labels shorten to the name only ("Desktop"); the width, the
  "· from mobile" note and the override badge come back when you zoom in (the badge shrinks to a
  dot rather than vanishing). Labels never overlap the next frame's label.
- The threshold is one constant in `board/viewport.ts`, with a unit test.

## 6. Maths in number fields

- Number and length fields (`ScrubNumber`, the length field, spacing) accept simple sums:
  `120+24`, `48*2`, `100/3`, `(16+8)*2`, and a leading `+8` / `-8` adds to the current value.
  Units stay as typed (`24px*2` → `48px`; `10vw+2` stays `12vw`).
- Pressing Enter or leaving the field works it out. Anything that doesn't parse puts the old value
  back. No `eval`: a small parser in `fields/maths.ts` with its own tests (precedence, brackets,
  decimals, divide by zero, junk input).

## 7. Phone: the inspector sheet

- **Opens short, on Content.** Selecting a block opens the card at its short height
  (about a third of the screen) showing the Content group, not half-height scrolled to Layout.
  Drag up for more, as now.
- **Closes when a left panel opens.** Opening Layers, Pages, Media or Add on a phone collapses the
  inspector to its title row; it comes back when the panel closes. The two never stack.
- **Resting sizes:** collapsed (title row), short (about a third), full. Tested in `card.test.ts`.

## 8. Phone: no shortcuts sheet on touch

- On touch devices, hide the shortcut cheat sheet: no "Keyboard shortcuts" entry in the palette,
  `?` doesn't open it, and the palette doesn't show key hints beside actions.

## 9. Alex's Samsung A55 screenshots

Alex is sending screenshots of editing on his Samsung A55 (Android, Chrome). Each problem they
show gets a line here and is fixed in this branch if it's part of this polish, or noted in
`ROADMAP.md` if it's bigger.

- _Waiting for the screenshots._

## Done means

- **Unit tests:** field order (content first) for a few block types, the maths parser, the label
  zoom threshold, the card's resting sizes.
- **Browser tests** (`cms/tests/inspector-phone.spec.ts`):
  - desktop: selecting a Text block shows Content first; there's no size switch in the inspector;
    the top bar switch changes the scope bar; typing `48*2` in a size field gives 96;
  - zoomed out below the threshold, labels show names only;
  - first open of a page with the left panel open: no frame starts under the panel or inspector;
  - phone (390×844, touch): tap a block, the sheet opens short on Content; open Layers, the sheet
    collapses; close it, the sheet returns; `?` does nothing.
- **Real Chrome:** check the editor at desktop and at 390px; screenshots in
  `docs/screenshots/inspector-phone/`.
- **Checks:** all unit tests, `npm run build` and the editor specs pass; public pages are
  byte-identical to `main` (editor-only change).
- **Records:** one line per decision in `DECISIONS.md`; tick item 1 in `ROADMAP.md`.

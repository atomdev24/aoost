# Task: resizable project pieces and sketchbook cover materials

Alex chose these on 19 Nov 2026. Work on branch `projects-resize-materials` from `main`. Commit after each step. Never push or touch `main`; Claude merges. Follow `CLAUDE.md`. Use `npm_config_cache=/tmp/aoost-npm-cache`.

## 1. Project pieces can be resized (AoostProjects)

- **Keep the freeform arrangement exactly as it is.** Alex likes it.
- **Add an optional per-piece size**, for example `scale` (a multiplier on the piece's current size, 0.4–2.5), **per breakpoint**. Use the existing responsive mechanism, which has four sizes: mobile is the base, tablet and desktop inherit from mobile, and widescreen inherits from desktop. Pieces without it render **byte-identically** to today.
- **Editor:** selecting a piece on the canvas, inside the projects block in any frame, shows the corner handles. Dragging a handle resizes that piece, keeping its aspect ratio, for the active frame's breakpoint. One drag is one undo step.
  - The inspector row for each piece gets a Size field (drag-to-scrub, as a %).
  - The scope bar, tint and "Reset to …" work as for other per-size values.
- **Neighbours** must not jump around when one piece grows. If the layout code positions pieces relative to each other, keep each piece anchored at its own position and let it overlap like paper on a table.
- **Do not add captions or labels to the artwork.**

## 2. Sketchbook cover materials (AoostJournals)

- **Add an optional `material` to each journal:** `"none"` (the default, today's look), `"kraft"` or `"leather"`.
  - **Kraft board:** brown recycled card with dark flecks. Use an inline SVG `feTurbulence` speckle over the cover colour (or a warm kraft brown if there's no colour). Matte.
  - **Worn leather:** pebbled grain using `feTurbulence` turbulence at low opacity, slightly scuffed corners and edges, and a subtle sheen that catches the light on hover. A sticker or cover image sits on it slightly debossed (tone on tone, low contrast).
  - Keep each existing elastic band, sticker and cover image.
  - Make it look good at mobile and desktop sizes.
  - Skip the texture effects for `prefers-reduced-motion` only where they animate.
- **Editor:** a Material field (None / Kraft board / Worn leather) per sketchbook.
- **Content:** set sketchbook 2 (brown cover) to `"kraft"` and sketchbook 4 (black, monkey sticker) to `"leather"` in `content/pages/home.json`. Leave 1 and 3 as `"none"`.
- **Public output:** only the homepage's sketchbook markup and CSS may change. Every other page must be byte-identical: compare against `main`, built with the timestamp pinned.

## Done means

- Unit tests:
  - scale render, including that it's absent when unset;
  - material render for each option.
- Browser test: resize a project piece in the Mobile frame; the desktop size is unchanged; undo works.
- Screenshot: `docs/screenshots/projects-journals/` showing the sketchbooks at 1440 and 390.
- All unit tests, the build and the editor browser specs pass.
- Append a short summary to `DECISIONS.md`.

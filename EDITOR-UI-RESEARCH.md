# Editor UI research (27 Nov 2026)

Goal: make the editor feel like the best tools (Linear, Figma, Apple, Raycast) using a few clear rules.
The boards are on the Design canvas, in the "UI research" row: rules vs aoost today, motion and menus
(try it), glass (frosted vs liquid), dark themes.

## Rules and where aoost stands
1. One accent colour, only for the main action and selection. Partly: colours were typed out ~218 times.
2. Three word greys (content, labels, hints). Missing: labels were the same colour as content.
3. Glass only on floating things (bars, menus, popups); a solid fallback. Partly: side panels are glass.
4. Motion under ~250 ms, fast start and gentle stop, never a slow start. Partly: the default curve everywhere.
5. Menus grow from their button; unattached popups stay centred. Missing.
6. A press shows (scale to 0.97). Missing.
7. No animation for keyboard or hundred-times-a-day actions (⌘K). Partly.
8. Safe triangle for sub-menus. Missing (needed before the right-click menu gets sub-menus).
9. Tooltips: wait once, then instant along a toolbar. Missing (browser title tooltips).
10. Reduce motion and big targets. Good.

## Order
1. **Colours and greys** ✓ (this change): one colour list in editor.css; Graphite default, Ink and
   Paper at night in the "…" menu (Colours). Filled buttons use a deeper blue (#1a6fe0) because white on
   #0a84ff was 3.7:1. Page frames get the theme's selection colour too.
2. **Motion kit** ✓ (built by Gemini via the relay, reviewed by Claude): two curves (`cubic-bezier(.23,1,.32,1)` out, `cubic-bezier(.77,0,.175,1)` in-out),
   menus from the trigger side from scale 0.96, press 0.97, no animation when opened by keyboard,
   one shared tooltip with a single timer, reduced motion built in.
3. **Glass tidy** ✓ (built by Claude; Gemini's account hit its weekly quota): glass only on floating pieces, side panels near-solid; liquid refraction
   (SVG displacement in backdrop-filter, Chromium only, frosted fallback) only on the status pill and
   phone tab bar.
4. **Safe sub-menus** in the shared menu, following the pointer (Linear, React Aria), off for touch.

## Motion kit: what was built (27 Nov 2026)
- Curve and timing names in editor.css (`--ed-ease-out`, `--ed-ease-in-out`, `--ed-dur-press/fast/`, `--ed-dur`);
  every editor transition now uses the fast-start curve (loops and spinners untouched; the toast's slow-start exit fixed).
- Press: buttons, icons, rail, Publish and the block tag shrink to 97% while pressed. Menu rows don't.
- Popovers (`ui/Popover.tsx`) grow from the side their button is on (data-side, transform-origin), the "…" menu
  from its top right corner. Modals stay centred.
- ⌘K opens instantly (no animation).
- One shared tooltip (`ui/tooltip.ts`): reads existing `title`s, waits 0.5s the first time, then instant along a
  toolbar for 0.3s; never on touch, never on rail buttons (they have their own label) or `[data-no-tip]`.
- Reduced motion turns off the press scale and the entrances (refresh.css, last).

Still to do from this step: other dropdowns that aren't `Popover` (Publish ▾, block … menus) could use the same
entrance; tooltips for icon-only buttons that have no `title` yet.

## Glass tidy: what was built (27 Nov 2026)
- Long panels (inspector, layers and other side panels, phone sheets, uploads, phone "More") are nearly solid
  (`--ed-panel-solid`, light blur); floating bars, menus and pop-ups stay glass with a faint bright top edge
  (`--ed-glass-edge`). Glass off or "reduce transparency" makes everything solid.
- The phone tab bar is glass now, denser than the other bars because its labels sit over bright pages.
- Liquid glass (`ui/liquid.ts`, loaded only in Chromium, and only with Glass toolbars on and no reduced
  motion or transparency): the top-left island and the phone tab bar bend what's behind them at the edges,
  using a displacement map drawn to each one's size. During zoom and pan they go back to plain frosted.

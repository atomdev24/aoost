# Task: per-screen-size image framing inside the aoost blocks

Alex (18 Nov 2026, after publishing Sections 2 and 3): the hero artwork on the **mobile** layout is clipped, and he can't reposition it. He needs to move, and if needed scale, imagery **inside its frame**, with **different positions per screen size** (mobile vs desktop now, tablet and widescreen later).

**Cause:**
- The aoost homepage blocks (`cms/src/components/aoost/*`) render their images with plain `object-fit: cover`, centred, and have no framing data.
- InDesign-style framing exists in the content model (`FrameFit` / `ResponsiveFrameFit` in `cms/src/schema/style.ts`, maths in `cms/src/editor/canvas/adjust.ts`, `AdjustImage.tsx`, `FocalPicker`), but only the standard media components use it.

## Rules

- You're on branch `aoost-image-framing` (from `main`). Commit after each step. **Never push**, and never touch `main`. Claude reviews, opens the PR and merges.
- Follow `CLAUDE.md`:
  - log judgement calls in `DECISIONS.md`;
  - use `npm_config_cache=/tmp/aoost-npm-cache`;
  - never print secrets;
  - plain UI wording.
- **Backwards compatible:** add an **optional** framing field to the image items of the aoost blocks. Content without it must render **byte-identically** to today. Verify this: build `main` to `/tmp/aoost-dist-before-framing` with the timestamp pinned, then compare against this branch.
- Reuse the existing `ResponsiveFrameFit` type, the `adjust.ts` maths, `AdjustImage`, `FocalPicker` and the responsive helpers (`setAt`, resolve). Don't invent a second system.

## 1. Data and rendering

- Give each image item in these blocks an optional `frame?: ResponsiveFrameFit`:
  - `AoostHero` (each `reel` item);
  - `AoostProjects` (each piece's image);
  - `AoostJournals` (cover images);
  - `AoostPlaylistBand` (covers).
- Check the rest of `components/aoost` for other cropped images, and include them if any exist.
- **Public render:** when a frame is set, the image's `object-position` comes from the focal point. Free mode applies the transform (zoom and pan) the same way the standard media components do. Each breakpoint's values apply at that breakpoint, so mobile values sit in the mobile media query and fall back to desktop/base, using the **same mechanism the standard Image component uses** for responsive styles.
- **Runtime scripts** (`components/aoost/runtime/*.js`, such as the hero reel slider) must keep working with the framed images.

## 2. Editor

- **Double-click to adjust:** double-clicking an aoost block's image in a canvas frame enters the existing **adjust image** mode for **that item**. This includes the currently visible hero reel slide; aoost blocks show their first paint in the editor, so make sure the image you double-click is the one you adjust.
  - Dragging moves the image, and scrolling, pinching or the handles scale it.
  - The result is written to **the breakpoint of the frame you're in**: desktop is the base, and mobile becomes a mobile override.
  - This must follow the same scope rules as everything else: the scope bar counts it, the field is tinted, and the label menu offers "Reset to desktop" and "Use on all sizes".
- **Inspector:** each image item's compact row gets the same image popover as standard media (preview with focal point, fit, Replace, alt), and edits the current breakpoint.
- **Undo:** one adjust session is one undo step.

## 3. Tests and done

- **Unit tests:**
  - framing render output, including that a mobile override only appears at the mobile breakpoint;
  - content without `frame` renders exactly as before.
- **Browser tests:**
  - On the Home page, select the Mobile frame, double-click the hero image, drag it, and exit. The mobile hero image position changes, the desktop one doesn't, and the scope bar shows the change.
  - "Reset to desktop" restores it.
- **Screenshot:** commit `docs/screenshots/aoost-framing/hero-mobile-adjust.png`.
- **Checks:** all unit tests and the build pass, and public output is byte-identical against `/tmp/aoost-dist-before-framing`. Known older public-site test failures (17 Nov content) are fine to leave.
- **Summary:** append a short summary to `DECISIONS.md`.

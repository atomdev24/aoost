# Task: editor refinement, Sections 2 and 3 (inspector controls; adding things and feedback)

Alex chose these designs element by element on 18 Nov 2026, after Section 1 (`EDITOR-SECTION1.md`, merged). This changes **only the editor at `/admin`**. The public site, the content format, the schema and the aoost homepage blocks stay exactly as they are. Keep Section 1's tokens: frosted glass, SF Pro with Inter as the fallback, `#0A84FF` accent, and type-only icons. Keep every feature that already exists: move it or restyle it, don't drop it.

## Rules

- You're on branch `editor-section2-3` (from `main`). Commit after each numbered step. **Never push**, and never touch `main`: Claude reviews and opens the PR.
- Follow `CLAUDE.md`:
  - log judgement calls in `DECISIONS.md` and anything that needs Alex in `BLOCKERS.md`;
  - never print secrets;
  - use `npm_config_cache=/tmp/aoost-npm-cache`;
  - plain UI wording.
- Use Puck's `overrides` API and CSS; don't fork Puck. Don't change auth. Don't add tablet or widescreen to the schema, but write the override UI so more breakpoints can slot in later.
- Gemini's quota is out. Do the work yourself.

## Section 2: inspector controls

### 1. Dense rows (Figma style)

- Every inspector field becomes a row with a **62px label column on the left and values in one or two columns** (`grid-template-columns: 62px 1fr 1fr`).
- Paired values share a row: padding vertical and horizontal, columns and gap, width and height, radius and border.
- Rows are 26px tall with 3px vertical padding.
- Groups (Layout, Frame, Content, Visible on) have an 11px secondary label and a hairline above.
- Inputs: background `rgba(0,0,0,.25)`, radius 6px, 12px text, tabular numbers.

### 2. Drag-to-scrub numbers

- Every number field has a small leading glyph or icon. **Dragging left or right on it changes the value**: 1 per ~3px, Shift for steps of 10, Alt for 0.1 where decimals make sense. The cursor is `ew-resize`.
- The field still accepts typing. Arrow keys change the value by 1 (Shift + arrow by 10). Enter commits and Esc reverts.
- **Each drag is one undo step** (merge updates during the drag).
- **Right-click a spacing field** to get a small menu that snaps it to the site's spacing steps (None, S, M, L, XL). Use the theme's spacing scale if one exists; otherwise define one in the theme and log the values in `DECISIONS.md`.

### 3. Full colour picker

- **Fill, text and border rows:** a swatch, the value and the opacity. Clicking the swatch opens a frosted popover with:
  - a saturation and brightness square, a hue slider and an opacity slider;
  - an **eyedropper button** that uses the browser `EyeDropper` API where it's available, and is hidden where it isn't;
  - a **format switch for Hex, RGB and HSL**. Editing works in each format, and the last format used is remembered in localStorage;
  - the opacity %;
  - an **"On this page"** row of the colours already used on the current page. Click one to apply it.
- Theme colours stay available. Show the theme swatches as a second row labelled "Site colours", if the theme has any.

### 4. Alignment grid with fine controls

- In layout sections:
  - a **3×3 alignment grid** sets both axes at once;
  - beside it, a direction toggle (row or column) and a wrap toggle;
  - a **"More" button** (sliders icon) that expands the fine controls underneath: Justify (start, centre, end, space-between) and Items (top, middle, bottom, stretch).
- The grid and the fine controls edit the same values and stay in sync. The expanded or collapsed state is remembered.
- Only show controls that the block's layout model actually supports; map them onto the existing layout fields.

### 5. Per-breakpoint overrides: scope bar, tint and menu

- **Scope bar at the top of the inspector**, under the block name. It shows the device icon and "Editing Mobile · 2 changes" (or "Editing Desktop"), with a **"Reset all"** action. Reset all removes every override for this block at this breakpoint, as one undo step. The bar is soft-accent tinted when you're editing a non-base breakpoint.
- **Fields whose value differs at the current breakpoint** get a blue-tinted input (`rgba(10,132,255,.16)`) and an accent-coloured label.
- **Clicking a tinted label** opens a small menu with:
  - "Reset to desktop";
  - "Use on all sizes", which writes the value to the base and removes the overrides;
  - a muted note with the desktop value.
- This replaces the blue dots. Keep the existing responsive model and helpers (`setAt`, `ResponsiveEditor`).

### 6. Image and media fields

- **Compact row:** thumbnail, file name and the fit mode. Clicking it opens a frosted popover with:
  - a preview with the **focal point** (reuse `FocalPicker`);
  - Replace (opens the media picker), Remove;
  - Cover, Fit or Fill;
  - alt text.
- **On the canvas, InDesign-style:** double-clicking an image block in the active frame enters "adjust image" mode.
  - You drag to move the image inside its frame, and scroll or pinch (or use corner handles) to scale it. The part outside the frame shows at 35% opacity with a dashed outline.
  - A small yellow tag shows the scale %. Esc or a click outside exits.
  - Store this as the existing focal point and scale fields if they exist. If there's no scale field, store position as the focal point only, skip scaling, and log it in `BLOCKERS.md`. **Don't change the schema.**
- **Dropping an image file onto an image on the canvas** uploads it and replaces that image, as one undo step.

## Section 3: adding things and feedback

### 7. Block library (Insert flyout) and / quick insert

- **Insert flyout:**
  - search box;
  - category chips (All, Layout, Media, Text, Saved);
  - a **2-column grid of cards, each with a mini thumbnail preview** and the block name.
- **Thumbnails:** generate them from a static render of each block's default props, or a hand-made simple SVG per block if that's more reliable. Saved library items use their snapshot if one exists.
- **Adding blocks:** drag a card onto the canvas (with the existing drop indicator), or click it to add below the selected block (at the end of the page if nothing is selected).
- **Quick insert:** pressing `/` (when not typing in a field) opens a centred frosted palette.
  - A search input and a filtered list with type icons sit on the left; a preview of the highlighted block sits on the right, with "Adds below Projects".
  - ↑↓ to choose, Enter to insert, Esc to close.

### 8. Media library

- **Masonry view (default):** 2 columns that keep each item's real aspect ratio, with a play glyph on videos.
- **Usage markers:** a small blue dot on items used anywhere on the site, and an **"Unused"** filter chip next to All, Images and Video. Usage is computed from the content.
- **Grid/list toggle in the header.** List view shows a thumbnail, file name, dimensions or duration, "used on: Home, Projects" or "not used", and the file size. Remember the view.
- Upload button, drop anywhere in the flyout to upload, search box. Drag an item onto the canvas or onto an image to place or replace it.

### 9. Save and publish feedback

- **Save state:** the left island replaces the "Draft · saved" text with a small dot: grey when saved, pulsing accent while saving, and red with a tooltip if saving failed. The tooltip always gives the last-saved time.
- **Publish button:**
  - shows a **count badge** of unpublished changes;
  - while publishing it becomes the progress indicator (spinner plus "Saving…", then "Rebuilding…"), with honest stages from the real publish flow;
  - then turns **green "Live"** for ~3s before returning to "Publish".
- **Details sheet:** **clicking the count badge** opens a frosted sheet with "Publish N changes", which pages and blocks changed, and the steps (Saving to GitHub, Rebuilding the site, Live on alexoostendurp.com). If a publish **fails**, the sheet opens by itself and marks the failed step in red, with a plain message and a Retry button.
- Keep Discard draft in the right island's `…` menu.

### 10. Loading and empty states

- **Loading:** when the editor opens a page, show the **last snapshot** of that page immediately inside each frame (reuse `screenshot.ts` or the existing snapshot mechanism; otherwise store a downscaled snapshot per page and breakpoint after each save). Show it greyed to 55% opacity, with a small "Loading latest…" chip at the bottom centre. Crossfade to the live frames when they're ready. If there's no snapshot, use plain empty frames with the chip.
- **New empty page:** the frame shows "Start from" with template cards: Blank, Journal entry, Gallery page, plus any saved page templates. Define the two built-in templates from existing blocks. Underneath, a muted line: "Press / to add a block, or drop an image". Dropping an image on the empty page adds an Image block.

## Done means

1. **Screenshots:** Playwright screenshots of `/admin` (Home, 1440×900) are committed to `docs/screenshots/editor-section2-3/` for these states:
   - inspector with a block selected on Mobile with overrides (scope bar visible);
   - colour popover open;
   - alignment fine controls expanded;
   - image popover;
   - image adjust mode;
   - Insert flyout;
   - / palette;
   - media masonry;
   - media list;
   - publish sheet;
   - new empty page;
   - loading snapshot.
2. **Browser tests:**
   - scrubbing changes a value and undoes in one step;
   - the colour format switch round-trips the value;
   - the alignment grid and the fine controls stay in sync;
   - "Reset to desktop" and "Reset all" remove overrides;
   - / inserts a block below the selection;
   - the Unused filter works;
   - a publish failure opens the sheet with the failed step. Mock the publish endpoint.
3. **Existing tests:**
   - Update the editor tests that the layout changes break, rather than deleting them.
   - Some public-site tests already fail on `main` because of content Alex published on 17 Nov (`hero.jpg`, 6 projects). Leave them unless you're touching them anyway, and note them in the summary.
   - Unit tests and the build pass.
   - Public pages are byte-identical: build `main` first to `/tmp/aoost-dist-before-s23` with the build timestamp pinned, then compare against your branch's output.
4. **Summary:** append a short summary of what changed and anything unfinished to `DECISIONS.md`.

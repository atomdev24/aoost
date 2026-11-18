# Task: editor refinement, Section 1 (workspace frame)

Alex chose these designs element by element (Nov 2026). This changes **only the editor at `/admin`**. The public site, the content format, the schema and the aoost homepage blocks stay exactly as they are. Restyle and rearrange the existing workspace (`cms/src/editor/workspace`, `board`, `ui`, `editor.css`, `workspace.css`, `board.css`). Keep every feature that already exists: move it, don't drop it.

## Rules

- You're on branch `editor-section1` (from `main`). Commit after each numbered step below with clear messages. **Never push to `main`**: every push to `main` deploys the live site. Don't push at all; Claude reviews and opens the PR.
- Follow `CLAUDE.md`:
  - log judgement calls in `DECISIONS.md` and anything that needs Alex in `BLOCKERS.md`;
  - never print secrets;
  - on this Mac use `npm_config_cache=/tmp/aoost-npm-cache` for npm/npx;
  - plain UI wording, with no Western/cowboy references.
- Use Puck's `overrides` API and CSS. Don't fork Puck. Don't change auth settings.
- Don't add tablet or widescreen to the schema. That's a separate task.

## 0. Tokens (apply everywhere in the editor)

- **Canvas:** plain `#161618`. **No dot grid by default.** The dot grid becomes a toggle (see step 4).
- **Panel material, "frosted glass":** use this for every floating island, flyout, inspector, menu and popover:
  - background `rgba(36,36,40,.62)`, `backdrop-filter: blur(22px) saturate(170%)` (plus the `-webkit-` prefix);
  - border `1px solid rgba(255,255,255,.07)`, radius 12px;
  - a subtle shadow `0 8px 24px rgba(0,0,0,.35)`;
  - inside the glass: inputs `rgba(0,0,0,.25)`, segmented track `rgba(255,255,255,.06)`, active segment `rgba(255,255,255,.14)`.
- **Text:** `#ECECEE` primary, `#8E8E93` secondary. Accent `#0A84FF`, soft accent `rgba(10,132,255,.22)`.
- **Font:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif`.
  - Load Inter as a webfont so non-Apple machines get Inter, not Arial or Segoe.
  - Sizes: 12px panel text, 11px section labels (medium weight, secondary colour), 13px block names.
  - `letter-spacing: -0.01em`, `-webkit-font-smoothing: antialiased`.
- **Layer icons by type only:**
  - section → `square` outline;
  - text → letter T;
  - image or media → photo;
  - embed or code → `</>`;
  - nav → menu.
  - **Remove any per-block custom icons** (no music icon for Playlists, no horse for Rodeo, etc.). Icons are 13px in the secondary colour.

## 1. Top bar → floating islands

Remove the full-width 52px bar. Three frosted islands float over the canvas, 10px from the top:

- **Left island:** site mark, page switcher (`Home ▾`), save state ("Draft · saved just now").
- **Centre island:** the segmented tool group (Select, Frame, Section, Text, Image, Ask Claude), then a hairline divider, then breakpoint buttons (Desktop, Mobile). Clicking one makes that frame active. Shift-click, or the frame menu, shows or hides it (see step 4).
- **Right island:** Claude status pill (it must still reflect reality), Preview, Discard draft (keep it in an overflow `…` menu if space is tight), and Publish (accent pill).
- **Zoom:** when the canvas is zoomed in and content passes under an island, the island stays legible thanks to the glass. Islands drop to 70% opacity while the user is dragging or panning, and come back on release.

## 2. Left panel → icon rail and flyouts

- **Rail:** a slim frosted rail (36px wide) on the left, below the left island.
  - Top group of icon buttons: **Layers, Pages, Insert (blocks and saved library), Media.**
  - Bottom group after a hairline: **Navigation, Theme, Fonts, Global** (the existing panels).
  - Each button has a tooltip with its name.
- **Flyouts:** clicking an icon opens its panel as a frosted flyout (about 260px wide) beside the rail, with the panel's name and a **pin** button in its header.
  - Clicking the **active icon again closes the flyout.**
  - **Unpinned** flyouts close when the user clicks the canvas.
  - **Pinned** flyouts stay open until their icon is clicked again or they're unpinned.
  - **Esc** closes an unpinned flyout.
  - Remember the pin state and the last open panel in localStorage (wrapped in try/catch, like the existing `remembered` helper).
- **Closing a flyout never changes the selection.** The selected block and the inspector stay as they are.
- **Layers flyout:** keep the current behaviour (select, reorder, add section). Rows are 26px tall, with the type icon, the name, and children indented 14px. The selected row has a soft-accent background and 6px radius.

## 3. Inspector → floating panel that appears on selection

- A frosted panel (about 284px wide) floats on the right, below the right island.
- **It's only shown while a block is selected.** It fades and slides in (150ms), and hides when nothing is selected (click on empty canvas or press Esc).
- Page settings (shown today when nothing is selected) move into the **Pages flyout** as a "Page settings" action per page.
- Keep the contents and behaviour:
  - block name and type;
  - Desktop/Mobile switch;
  - grouped sections (Layout, Frame, Content, Visible on);
  - **blue override dots** and "Reset to desktop".
- Restyle the sections with 11px labels and hairline separators.
- If the panel is taller than the window, it scrolls inside.

## 4. Canvas → free arrangement

- Frames (Desktop 1440, Mobile 390) can be **dragged by their label** to anywhere on the canvas. The label is the drag handle; the cursor changes to `grab`.
- **Default arrangement:** Desktop and Mobile side by side, as today.
- **Positions, hidden frames, zoom and pan are remembered per page** in localStorage.
- Each frame label has a small `…` menu with **Hide frame** and **Reset positions**.
- **Hidden frames:** when any frame is hidden, a small frosted chip at the bottom-left reads "Mobile hidden · Show". At least one frame must always stay visible.
- **Zoom pill:** a frosted pill at the **bottom-right** (moved from bottom centre) holds −, the zoom %, +, Fit, and a **dot-grid toggle** (grid icon).
  - The dot-grid choice is remembered.
  - When it's on, use a 20px grid of `#2C2C30` dots.
  - Keyboard: `'` (apostrophe) toggles the grid.
- Keep the disabled "+ Add a breakpoint" slot after the last frame, with its tooltip.

## 5. Selection and hover

- **Hover:** 1px outline in `rgba(10,132,255,.55)`.
- **Selected, active frame:** a 1.5px solid accent outline.
  - Add a **name tag**: a small accent pill above the top-left corner, 10px text, radius 4 4 4 0.
  - Add 4 **corner handles** (6px white squares with an accent border). They resize where the block supports resizing (free-canvas layers); elsewhere they're visual only.
- **Hovering the name tag expands it** into quick actions inside the same pill:
  - Move up, Move down, Duplicate, Hide (Visible on), Delete.
  - Each has a tooltip, and each uses the existing actions in `canvas/actions.ts` and the store, so undo works.
- **Other frames:** the same block shows a 1px dashed accent outline with no tag or handles.

## Done means

1. Playwright screenshots of `/admin` (Home page, 1440×900) are committed to `docs/screenshots/editor-section1/` for these states:
   - nothing selected;
   - a block selected;
   - name tag expanded;
   - Layers flyout pinned;
   - Mobile frame hidden;
   - dot grid on.
2. Browser tests cover:
   - clicking the active rail icon closes the flyout;
   - an unpinned flyout closes on a canvas click and a pinned one doesn't;
   - closing a flyout keeps the selection;
   - the inspector hides when nothing is selected;
   - Duplicate and Delete from the name tag work and undo;
   - a dragged frame position survives a reload;
   - the dot-grid toggle survives a reload.
3. Update the existing tests that the layout change breaks, rather than deleting them. All unit and browser tests and the build pass. Public pages are **byte-identical**: compare the `dist/` output for every published page before and after.
4. Write a short summary of what changed and anything unfinished at the end of `DECISIONS.md`.

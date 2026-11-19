# Task: phone editing, the command palette and shortcuts

Alex chose these on 19 Nov 2026. Work on branch `editor-phone-palette` from `main`. Commit after each step. Never push or touch `main`; Claude merges. Follow `CLAUDE.md`, use `npm_config_cache=/tmp/aoost-npm-cache`, and never commit `cms/node_modules`. Another build may be running in the `/tmp/aoost-play` worktree, so don't use port 8787 if it's busy.

## 1. Phone editing: the full editor, floating (Alex's choice: "same as desktop")

The editor at `/admin` on a phone (under 768px wide, touch) keeps the **same floating islands, icon rail with flyouts, floating inspector and free canvas** as desktop, adapted for touch:
- **Touch targets:** at least 40px. Islands and rail scale up slightly; the inspector becomes a floating card at the bottom right that can expand to near full height (drag its header) and collapse to just its title.
- **Gestures:** one finger on empty canvas pans, two-finger pinch zooms, and two-finger drag pans.
- **Selection:** tapping selects. Long-press replaces right-click (the spacing-step snap menu, the frame menus). Name-tag quick actions open on tap rather than hover.
- **Adjust image:** a double tap enters adjust mode, where a finger drags and a pinch scales. Keep the cover clamp; with no Alt key on a phone, add a small "Free move" toggle chip in the adjust tag.
- **Default view:** on load, show the Mobile frame and fit it to the screen. Other frames stay available.
- **Layout:** no horizontal scrolling of the editor chrome, and nothing hidden behind the iOS home indicator (use the safe-area insets).

## 2. Home-screen app (PWA)

- Add a web app manifest for `/admin`:
  - name "aoost";
  - `display: standalone`;
  - background and theme colour `#161618`;
  - icons from `art/app-icon-{180,192,512,1024}.png`. Copy them into the editor's static assets; 180 is the `apple-touch-icon`.
- Add a minimal service worker that caches the editor shell for a fast start, and **never** caches the API, draft or publish requests.
- iOS meta tags: `apple-mobile-web-app-capable` and a black-translucent status bar.
- **BLOCKERS.md:** add "Make the editor sign-in last longer". In Cloudflare Zero Trust, go to Access, then Applications, then the editor app, and set Session Duration to 1 month, so the phone app doesn't keep asking for the email code. Alex has to do this himself.

## 3. Command palette (Cmd+K): search, recent, actions, plus Ask Claude

- A frosted, centred palette.
- **Empty state:** Recent (pages and blocks visited recently) and Actions (common commands), each showing its shortcut.
- **Typing searches everything:**
  - pages (go to);
  - blocks on the page (select);
  - blocks to insert (add below the selection);
  - media;
  - every editor action (publish, show a frame, toggle the grid, hide a block, reset overrides, and so on).
  - Rank with simple fuzzy matching.
- **Ask Claude:** when the query looks like a sentence (several words, or no strong match), the top row is "Ask Claude to do this" (Cmd+Enter). It sends the request through the editor's existing Ask Claude path (the same one the toolbar's Ask Claude tool uses).
  - If Claude isn't connected, that row reads "Connect Claude" and explains in one line how to connect.
  - Matching actions still appear below it.
- **Keys:** ↑↓, Enter, Esc. On phones, the palette opens from a search icon in the left island.

## 4. Shortcuts (Alex confirmed this list)

- **Palette and help:** Cmd+K palette; `?` cheat sheet.
- **Tools:** V Select · F Frame · T Text · I Image.
- **Canvas:**
  - Space+drag pans;
  - Cmd+ / Cmd− / Cmd0 / Shift1 zoom in, zoom out, 100% and fit all;
  - Cmd1/2/3/4 show the Widescreen, Desktop, Tablet and Mobile frames;
  - `'` toggles the dot grid.
- **Blocks:**
  - Cmd D duplicates;
  - Delete deletes;
  - Cmd↑/↓ moves up and down;
  - Cmd Shift H hides on this size;
  - Enter edits or adjusts the selection, and Esc steps out.
- **Panels:**
  - L Layers · P Pages · M Media · A Add (Insert), each toggling its flyout;
  - `/` quick insert.
- **History and publishing:** Cmd Z / Cmd Shift Z undo and redo; Cmd S saves the draft; Cmd Shift P opens the publish sheet.

How shortcuts behave:
- Single-letter shortcuts never fire while typing in a field.
- Cmd maps to Ctrl on Windows.
- On Mac, Cmd1–4 and Cmd+/− must override the browser.
- Keep existing shortcuts working where they don't clash; log any clash in `DECISIONS.md`.
- **The cheat sheet:** a frosted overlay listing every shortcut by group, also reachable from the palette.

## Done means

- **Unit tests:** fuzzy ranking, the action registry, the shortcut map (no duplicates), and the "looks like a sentence" rule.
- **Browser tests:**
  - Cmd+K opens the palette, typing "publish" runs the action, and Esc closes it;
  - "/" opens quick insert;
  - Cmd2 shows the Desktop frame;
  - `?` shows the cheat sheet;
  - a phone viewport (390×844, touch) loads the editor with the Mobile frame fitted, a tap selects a block, and the inspector card expands;
  - the manifest is served with its icons.
- **Screenshots:** `docs/screenshots/phone-palette/` (palette empty, palette with Ask Claude, cheat sheet, phone editor).
- **Checks:** all unit tests, the build and the editor specs pass. Public pages are byte-identical to `main`.
- **Summary:** append a short summary to `DECISIONS.md`.

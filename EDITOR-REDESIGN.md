# Task: editor redesign (direction B, dark Pro) + side-by-side breakpoint canvas

Alex picked **direction B** from the mockups canvas (https://claude.ai/artifact/1oTzmJpDMRm2dNcAkbpJ1J, row "Editor redesign", artboard "B · Dark (Pro apps)"). This changes **only the editor at `/admin`**. The public site, the content format and the aoost homepage blocks stay exactly as they are.

## Rules

- Work on a new branch `editor-redesign` from `main`, then open a PR to `main` for Alex to review. **Never push to `main`**: every push to `main` deploys the live site.
- Same working rules as `CLAUDE.md`: commit after each step, log judgement calls in `DECISIONS.md`, put anything that needs Alex in `BLOCKERS.md`, never print secrets. On this Mac, use `npm_config_cache=/tmp/aoost-npm-cache` for npm/npx.
- Editor auth is now Cloudflare Access (`AUTH_MODE = "access"`). For local dev, use the password mode or the dev bypass the code already has. Don't change the production auth settings.
- Plain wording in the UI, no Western/cowboy references (see `CLAUDE.md` Taste).

## 1. Look (direction B)

Apple pro-app dark: think Final Cut Pro or Xcode. Calm, dense and precise.

- Tokens:
  - Canvas `#161618` with a 20px dot grid `#2C2C30`.
  - Panels `#1E1E21`, top bar `#232326`, hairlines `#3A3A3E`.
  - Text `#F5F5F7`, secondary text `#A1A1A6`.
  - Accent `#0A84FF`, soft accent `rgba(10,132,255,.18)`.
  - Segmented controls: track `#2E2E32`, active segment `#48484D`.
  - Inputs `#2C2C30`.
- Type: `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui`, at 13px base and 11px section labels (semibold, secondary colour).
- Radius: 8px controls, 10px frames, 12px floating bars. Use 1px hairlines and no heavy shadows, except under frames and the floating zoom bar.
- Top bar, 52px:
  - Left: site mark, the page switcher (`Home ▾`), and save state ("Draft · saved just now").
  - Centre: a segmented tool group (Select, Frame, Section, Text, Image, Ask Claude).
  - Right: Claude status pill, Preview, and Publish (an accent pill).
  - The Claude pill must reflect reality: show "Claude not connected" while the connector has no credentials.
- Left panel (248px): Pages / Layers / Assets as a segmented control. Layers lists the page's sections with the selected one in the accent colour, and has "+ Add section" at the bottom.
- Right inspector (284px):
  - At the top: the block name, its type, and a **Desktop / Mobile segmented switch** for the breakpoint being edited.
  - Below: grouped sections (Layout, Frame, Content, Visible on).
  - Values overridden for the current breakpoint get a **blue dot**, plus a "Reset to desktop" action.
- Restyle every Puck surface: fields, drawers, the outline, modals and the quick-edit mode. Nothing should look like stock Puck. Use Puck's `overrides` API and CSS; don't fork Puck.
- Keyboard: V select, F frame, T text, Space-drag pan, ⌘+/⌘−/⌘0 zoom, ⌘Z/⇧⌘Z undo/redo, ⌘S save draft.

## 2. Side-by-side breakpoint canvas (the main feature)

Replace the single preview with an **infinite pan/zoom canvas** that shows the page **once per breakpoint, side by side**: Desktop (1440) and Mobile (390), like Framer.

- Each frame is a live render of the **same draft** at its width, using the existing draft-preview renderer (iframes are fine). Frames are labelled above ("Desktop 1440", "Mobile 390 · 2 overrides").
- **One document, many views:** an edit in any frame updates every frame immediately. Pan, zoom, "Fit all" and the zoom % sit in a floating bar at the bottom centre.
- **Linked selection:** selecting a block in one frame selects and highlights it in every frame, with an accent outline and a name tag on the active frame. The inspector edits that block. Changing a layout or style value while a frame is active writes to **that frame's breakpoint** (desktop = base for wide screens, mobile = the mobile override), following the existing responsive model. Content (text, images, links) is shared.
- Clicking a frame makes its breakpoint active, and the inspector's Desktop/Mobile switch follows, and the other way round.
- A dashed **"+ Add a breakpoint"** slot sits after the last frame. Tablet isn't in the data model yet, so show the slot disabled with a "Coming soon: tablet and custom widths" tooltip and log it in `DECISIONS.md`. Don't add tablet to the schema in this task.
- Free-canvas sections and the aoost homepage blocks must still work in both frames. The aoost blocks keep showing their first paint in the editor (Preview runs them for real).
- Performance: render off-screen frames lazily, and debounce re-renders while typing (~150 ms). Keep it smooth with the homepage open on a MacBook Air.
- Remember the canvas position and zoom per page (local storage is fine).

## 3. Done means

1. The editor matches the B mockup closely. Commit Playwright screenshots of `/admin` with the Home page open at 1440×900 to `docs/screenshots/editor-redesign/`, next to an export of the mockup.
2. Browser tests cover:
   - Selecting a block in the mobile frame highlights it in the desktop frame.
   - Changing columns while Mobile is active writes only the mobile override and shows the blue dot.
   - "Reset to desktop" removes the override.
   - Text edits show up in both frames.
   - Zoom and Fit all work.
3. All existing unit and browser tests still pass, and the build passes. Public pages are byte-identical before and after: compare the `dist/` output for every published page.
4. Open a PR `editor-redesign` → `main` with screenshots and a short plain-English summary for Alex: what changed, how to use the side-by-side canvas, and anything not done. **Do not merge.**

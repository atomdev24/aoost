# Workspace layout: A as the base, B's Simple mode, Phone 1 (Nov 2026)

Alex picked from the mockups (Design canvas "aoost editor: UI audit and directions"): **A · Calm
workspace** as the base, **B's Simple mode** for teammates, and **Phone 1 · bottom tabs** on phones.

## Stages (one PR each)
1. ✓ **One status.** Saved, not-live count and live sync in one pill (amber "Draft · 3 changes",
   green "Live", red "Not saved"); click for details (saved time, the changes, live sync, Claude).
   Publish carries its count inside the button. The checks badge stays (Alex asked for it).
2. ✓ **Labelled rail.** Add, Layers, Pages, Media, Comments with words under the icons; one Site
   button opens Navigation, Theme, Fonts, Shared blocks and History.
3. ✓ **Actions above the selection.** The name tag above a selected block now always shows its
   actions: the main one in words (Edit text, Replace), move, duplicate, hide, delete and Settings.
   Settings shows or hides the side panel and is remembered per person; it starts shown, so nobody
   loses the panel they know (Figma's UI3 lesson).
4. ✓ **Simple mode (B).** A Simple / Full switch next to the status: Simple shows only Content in
   the side panel (with "Switch to Full"), no resize handles, Desktop and Mobile only (no "Add a
   breakpoint"), no Site button, brand colours only in the text bar. Full is the whole editor.
   Remembered per person; until chosen, Owners start in Full and everyone else in Simple.
5. **Phone 1.** One slim top row, bottom tabs (Add, Layers, Pages, Media, More), half-height
   sheets, block actions above the tabs.
6. **Speed.** Redraw only the block that changed; side frames catch up after; lighter first load.

## Checks
Each stage: unit tests, build, browser at 1440 and 390.

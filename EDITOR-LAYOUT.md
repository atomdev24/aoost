# Workspace layout: A as the base, B's Simple mode, Phone 1 (Nov 2026)

Alex picked from the mockups (Design canvas "aoost editor: UI audit and directions"): **A · Calm
workspace** as the base, **B's Simple mode** for teammates, and **Phone 1 · bottom tabs** on phones.

## Stages (one PR each)
1. ✓ **One status.** Saved, not-live count and live sync in one pill (amber "Draft · 3 changes",
   green "Live", red "Not saved"); click for details (saved time, the changes, live sync, Claude).
   Publish carries its count inside the button. The checks badge stays (Alex asked for it).
2. ✓ **Labelled rail.** Add, Layers, Pages, Media, Comments with words under the icons; one Site
   button opens Navigation, Theme, Fonts, Shared blocks and History.
3. **Actions above the selection.** A small bar right above what you click (Edit text / Replace,
   Style, Move, Settings, ···); the side panel opens when asked for, or stays pinned for those who
   like it.
4. **Simple mode (B).** A Simple / Full switch: Simple shows content first in plain words, brand
   colours and text styles only, no layout or screen-size controls; Full is today's editor.
   Default Simple for Editor-role teammates, Full for Owners.
5. **Phone 1.** One slim top row, bottom tabs (Add, Layers, Pages, Media, More), half-height
   sheets, block actions above the tabs.
6. **Speed.** Redraw only the block that changed; side frames catch up after; lighter first load.

## Checks
Each stage: unit tests, build, browser at 1440 and 390.

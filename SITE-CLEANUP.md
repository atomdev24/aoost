# Task: homepage clean-up (19 Nov 2026)

Alex wants the public homepage trimmed while he redesigns sections. Work on branch `site-content-cleanup` in this worktree. Commit, and don't push: Claude merges.

Follow `CLAUDE.md`. Use `npm_config_cache=/tmp/aoost-npm-cache`.

Each new option must be **optional and backward compatible**, with the old behaviour as the default and an editor field (Puck config) for it. Then set the content in `content/pages/home.json` and `content/site.json`.

1. **Ticker** (AoostHero, `tickerLines` in `AoostHero.tsx` and `runtime/hero.js`)
   - Add `showTicker` (default `true`). When it's `false`, render no ticker strip at all, and make the runtime cope with that.
   - Also stop falling back to "welcome" and "pick a disc" when the ticker list is empty and `showTicker` is `true`. Use no fallback lines.
   - In the content, set `showTicker: false` and leave the ticker list empty.

2. **Sticky note on the projects table** (AoostProjects `note`)
   - Add `note.style: "eye" | "plain"` (default `"eye"`). `"plain"` shows the same neon sticky note with no drawing on it.
   - In the content, set `note.style: "plain"`.

3. **Journals**
   - Rename the four journals to "sketchbook 1", "sketchbook 2", "sketchbook 3" and "sketchbook 4", in their current order.
   - Set the `sub` line ("tap a book to open it") to empty. Make sure an empty `sub` renders no element.

4. **Skills section**
   - Hide the `home-tools` section from the homepage, keeping its content so it can move to an About page later.
   - Use the page model's existing way to hide or unlist a section if there is one. If there isn't, remove it from `home.json` and save its JSON to `content/parked/skills-section.json`.

5. **Navigation**
   - Alex wants just the logo mark until he publishes other pages.
   - In the nav renderer (`cms/src/render/nav`), hide the Menu button when the menu would hold no published-page links. Social buttons alone don't count; nothing should open.
   - Drop items that point at unpublished or draft pages from the rendered menu.
   - In `content/site.json`, remove the mobile `social` nav item. Keep the page items: they'll appear automatically once those pages are published.

6. **Leave alone:** "aoost / portfolio", "Alex · Cape Town", the playlists band (it's being redesigned later), and the rodeo section.

## Checks

- Unit tests and the build pass.
- Update the tests that these changes affect.
- Build the public site and confirm:
  - the homepage has no ticker, no skills section and no Menu button;
  - the journals read "sketchbook 1" to "sketchbook 4";
  - the sticky note is plain.

Finish with a short summary.

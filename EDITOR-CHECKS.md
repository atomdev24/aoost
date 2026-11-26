# Ready-to-publish checks

Research item 2 (CMS research and roadmap, Nov 2026).

## Goal

Before anything goes live, the editor lists what would embarrass the team, in plain words, each
with a way to fix it: pictures without a description, empty picture or video blocks, links to
addresses that aren't pages, missing search descriptions, untranslated blocks in a live
translation, campaign pages without an end date. Teammates who aren't designers should catch these
without knowing to look.

## Choices

- **Checks are pure and shared** (`model/checks.ts`, tested): the editor shows them, and Claude
  can read them later through the connector.
- **They never block publishing.** "To fix" items come first; "Worth a look" after.
- **Only what goes live** is checked: published and unlisted pages, not drafts or variants.
- **Fix** opens the page and selects the block (or the page's settings for search text), so the
  right field is in front of you.
- Left for later: external links (can't be checked from the browser without a server round trip),
  oversized pictures (the library already serves resized copies), phone layouts nobody looked at.

## Checks

- Unit tests for each kind of check and their order.
- Editor: the list where Alex chose to see it, Fix selects the block; desktop and 390px.

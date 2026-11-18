# Task: bring the out-of-date tests in line with the current content

Work on branch `tests-current-content` from the latest `main`. Commit, and don't push: Claude reviews and merges.

Some browser tests still expect the homepage as it was before Alex's 17 Nov publish and later edits:
- `home-editor`'s "change a project title, swap a reel image…" test expects a `hero.jpg` reel item;
- `home.spec`, `nav.spec` and `sample.spec` expect 7 projects, a ticker, a skills section, a Menu button, and the old journal titles.

The site's **content is correct**. Update the **tests**, not the content.

Where possible, make the tests read the expected values from `content/` (for example, count the visible projects from `home.json`) so future content edits don't break them. Don't weaken what a test actually checks. If a test checks something that no longer exists on purpose (such as the ticker or the skills section on the homepage), either turn it into a check that it's hidden, or move it to the `/sample` page that exercises every feature.

**Done when:** the full browser suite and unit tests pass, and the build passes. Use `npm_config_cache=/tmp/aoost-npm-cache`. Append a 3-line summary to `DECISIONS.md`.
